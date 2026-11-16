// Pruebas de Mástil. Uso: node tests/run.mjs
// Carga la lógica de site/index.html (todo lo anterior a "build();") en un sandbox sin DOM real.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'site', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const main = scripts.find(s => s.includes('const OPEN='));
const code = main.slice(0, main.indexOf('\nbuild();'));

// DOM falso: cualquier propiedad o método existe y devuelve otro DOM falso.
const fake = () => new Proxy(function () {}, {
  get: (_, k) => (k === Symbol.toPrimitive ? () => '' : k === 'length' ? 0 : k === 'style' ? {} : fake()),
  set: () => true, apply: () => fake(),
});
const sandbox = { document: { getElementById: () => fake(), documentElement: { dataset: {} }, querySelectorAll: () => [], querySelector: () => null, createElement: () => fake(), body: fake(), addEventListener() {} }, innerWidth: 1000, window: {}, console, matchMedia: () => ({ matches: true, addEventListener() {} }) };
vm.createContext(sandbox);
const api = vm.runInContext(code + '\n({findVoicings,playable,detect,makeChord,pickStart,TPL,OPEN,spell,MAJ_ROOT,MIN_ROOT,setLang:l=>{lang=l},setCapoVar:n=>{capo=n},intName,symT,descT,invNames,tr,sheetModel})', sandbox);
const { setCapoVar, findVoicings, playable, detect, makeChord, pickStart, TPL, OPEN, setLang, intName, symT, descT, invNames, sheetModel } = api;

let fails = 0, checks = 0;
const bad = (msg) => { fails++; if (fails <= 30) console.log('FALLA:', msg); };
const ok = (c, msg) => { checks++; if (!c) bad(msg); };

// ---- validador independiente (fuerza bruta de asignación de dedos) ----
function brutePlayable(s, fr) {
  const notes = fr.map((f, k) => ({ k, f })).filter(n => n.f > 0);
  if (!notes.length) return true;
  const fs_ = notes.map(n => n.f);
  if (Math.max(...fs_) - Math.min(...fs_) > 3) return false;
  const n = notes.length;
  const finger = new Array(n).fill(1);
  const rec = (i) => {
    if (i === n) return valid();
    for (let f = 1; f <= 4; f++) { finger[i] = f; if (rec(i + 1)) return true; }
    return false;
  };
  const valid = () => {
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const A = notes[a], B = notes[b];
      if (finger[a] === finger[b]) {
        if (A.f !== B.f) return false;
        for (let t = Math.min(A.k, B.k) + 1; t < Math.max(A.k, B.k); t++) if (fr[t] < A.f) return false; // cejilla
      } else {
        const fd = Math.abs(finger[a] - finger[b]);
        if (A.f !== B.f && (A.f < B.f) !== (finger[a] < finger[b])) return false; // orden índice→meñique
        if (Math.abs(A.f - B.f) > fd + 1) return false;
      }
    }
    return true;
  };
  return rec(0);
}

// 1) playable() coincide con la fuerza bruta en una muestra enorme de formas aleatorias y las de cada acorde
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
let agree = 0;
for (let i = 0; i < 60000; i++) {
  const n = 3 + Math.floor(rnd() * 4), base = Math.floor(rnd() * 12);
  const fr = Array.from({ length: n }, () => rnd() < 0.2 ? 0 : base + Math.floor(rnd() * 5));
  const a = playable(0, fr), b = brutePlayable(0, fr);
  ok(a === b, `playable difiere de fuerza bruta en [${fr}] (${a} vs ${b})`); agree++;
}

// 2) todas las formas de todos los acordes y todas las inversiones
let totalV = 0, emptyInv = [];
for (let root = 0; root < 12; root++) TPL.forEach((t, ti) => {
  const c = makeChord(root, ti), pcs = c.tones.map(x => x.pc);
  for (let n = c.tones.length; n <= 6; n++) c.tones.forEach((bt, bi) => {
    const list = findVoicings(pcs, bt.pc, n);
    if (n === c.tones.length && !list.length) emptyInv.push(`${c.rootName}${t.sym} inv${bi} (${n} cuerdas)`);
    for (const v of list) {
      totalV++;
      const midis = v.frets.map((f, k) => OPEN[v.s + k] + f);
      const pset = new Set(midis.map(m => m % 12));
      ok(v.frets.length === n, `${c.rootName}${t.sym}: usa ${v.frets.length} cuerdas y no ${n}`);
      ok(v.s >= 0 && v.s + n <= 6, `${c.rootName}${t.sym}: se sale de las 6 cuerdas`);
      ok(v.frets.every(f => f >= 0 && f <= 15), `${c.rootName}${t.sym}: traste fuera de 0-15 [${v.frets}]`);
      ok(midis[0] % 12 === bt.pc, `${c.rootName}${t.sym}: el bajo no es ${bt.name} [${v.frets}]`);
      ok([...pset].every(p => pcs.includes(p)) && pcs.every(p => pset.has(p)), `${c.rootName}${t.sym}: notas incorrectas [${v.s}:${v.frets}]`);
      ok(new Set(midis).size === midis.length, `${c.rootName}${t.sym}: nota repetida exacta`);
      ok(brutePlayable(v.s, v.frets), `${c.rootName}${t.sym}: IMPOSIBLE de tocar s${v.s} [${v.frets}]`);
    }
  });
});

// 3) lo que arma "Seleccionar acorde": cada acorde, tras aplicarse, se lee como ese mismo acorde y no queda vacío
let noStart = [];
for (let root = 0; root < 12; root++) TPL.forEach((t, ti) => {
  const c = makeChord(root, ti), st = pickStart(c);
  if (!st) { noStart.push(`${c.rootName}${t.sym}`); return; }
  const notes = st.v.frets.map((f, k) => ({ s: st.v.s + k, f, midi: OPEN[st.v.s + k] + f })).sort((a, b) => a.midi - b.midi);
  const cands = detect(notes);
  ok(cands.some(x => x.root === root && x.ti === ti), `${c.rootName}${t.sym}: la forma inicial no se lee como el acorde pedido`);
});

// 4) regla vieja: 3+ notas distintas siempre reciben nombre de acorde
let combos = 0;
for (let mask = 1; mask < 4096; mask++) {
  const pcs = []; for (let i = 0; i < 12; i++) if (mask >> i & 1) pcs.push(i);
  if (pcs.length < 3 || pcs.length > 6) continue;
  const notes = pcs.map((p, i) => ({ midi: 40 + p + (i ? 12 : 0), s: 0, f: 0 })).sort((a, b) => a.midi - b.midi);
  ok(detect(notes).length > 0, `sin nombre para pcs ${pcs}`); combos++;
}

// 5) inglés: nada de español en nombres de intervalos, acordes e inversiones
setLang('en');
const ES = /\b(sin|mayor|menor|aumentad|disminuid|suspendid|dominante|quinta|octava|justa|inversi|Fundamental|Tritono|Un[ií]sono|a[ñn]adida|con)\b|ª/i;
for (let d = 0; d <= 39; d++) ok(!ES.test(intName(d)), `intervalo ${d} sigue en español: ${intName(d)}`);
TPL.forEach(t => { ok(!!t.en, `falta traducción: ${t.sym}`); ok(!ES.test(descT(t)), `descripción en español: ${descT(t)}`); ok(!/sin /.test(symT(t)), `símbolo con "sin": ${symT(t)}`); });
invNames().forEach(n => ok(!ES.test(n), `inversión en español: ${n}`));
let enNamed = 0;
for (let mask = 1; mask < 4096; mask++) {
  const pcs = []; for (let i = 0; i < 12; i++) if (mask >> i & 1) pcs.push(i);
  if (pcs.length < 3 || pcs.length > 6) continue;
  const notes = pcs.map((p, i) => ({ midi: 40 + p + (i ? 12 : 0), s: 0, f: 0 })).sort((a, b) => a.midi - b.midi);
  for (const c of detect(notes)) { ok(!ES.test(descT(c.t)), `descripción en español: ${descT(c.t)} (${pcs})`); ok(!/sin /.test(symT(c.t)), `símbolo en español: ${symT(c.t)}`); enNamed++; }
}
setLang('es');
ok(intName(7) === '5ª justa' && symT(TPL[24]) === '7(sin 5)', 'el español cambió');

// 5b) capo: con el capo en el traste N nada queda detrás de N, la "cuerda al aire" es el traste N,
//     y cada forma sigue siendo correcta y tocable (relativa al capo)
let capoV = 0, capoEmpty = 0;
for (let cp = 1; cp <= 9; cp++) for (let root = 0; root < 12; root++) TPL.forEach((t, ti) => {
  const c = makeChord(root, ti), pcs = c.tones.map(x => x.pc);
  for (let n = c.tones.length; n <= 6; n++) c.tones.forEach((bt, bi) => {
    const list = findVoicings(pcs, bt.pc, n, cp);
    if (n === c.tones.length && !list.length) capoEmpty++;
    for (const v of list) {
      capoV++;
      const midis = v.frets.map((f, k) => OPEN[v.s + k] + f), pset = new Set(midis.map(m => m % 12));
      ok(v.frets.every(f => f >= cp && f <= 15), `capo ${cp} ${c.rootName}${t.sym}: traste detrás del capo [${v.frets}]`);
      ok(v.rel.every((r, k) => r === v.frets[k] - cp), `capo ${cp}: rel mal calculado`);
      ok(midis[0] % 12 === bt.pc, `capo ${cp} ${c.rootName}${t.sym}: bajo incorrecto`);
      ok([...pset].every(p => pcs.includes(p)) && pcs.every(p => pset.has(p)), `capo ${cp} ${c.rootName}${t.sym}: notas incorrectas`);
      ok(brutePlayable(v.s, v.rel), `capo ${cp} ${c.rootName}${t.sym}: IMPOSIBLE s${v.s} [${v.rel}]`);
    }
  });
  setCapoVar(cp); const st = pickStart(c); setCapoVar(0);
  if (st) ok(st.v.frets.every(f => f >= cp), `capo ${cp}: pickStart pone notas detrás del capo`);
});
// el capo en 0 no cambia nada respecto a lo de antes
ok(findVoicings([0, 4, 7], 0, 3, 0).length === findVoicings([0, 4, 7], 0, 3).length, 'capo 0 distinto del default');

// 6) partitura: cada nota escrita reproduce exactamente su altura (una octava arriba) y cae en la línea/espacio correcto
const LETS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'], LETPCS = [0, 2, 4, 5, 7, 9, 11];
let sheetChecked = 0;
const checkSheet = (notes, chord, tag) => {
  const items = sheetModel(notes, chord), uniq = new Set(notes.map(n => n.midi)).size;
  ok(items.length === uniq, `${tag}: partitura con ${items.length} notas y hay ${uniq}`);
  for (const it of items) {
    const back = 12 * (it.wo + 1) + LETPCS[LETS.indexOf(it.L)] + it.off;
    ok(back === it.midi + 12, `${tag}: ${it.name} se escribe en otra altura (${back} vs ${it.midi + 12})`);
    ok(it.y === 40 - (it.wo * 7 + LETS.indexOf(it.L) - 30) * 5, `${tag}: posición vertical mal`);
    ok(Math.abs(it.off) <= 2, `${tag}: alteración rara ${it.acc}`);
    sheetChecked++;
  }
  for (let i = 1; i < items.length; i++) ok(items[i].idx >= items[i - 1].idx, `${tag}: notas desordenadas`);
};
{ // referencias conocidas: E2 (cuerda al aire) se escribe E3 bajo el pentagrama; E4 sonando se escribe E5 en el espacio bajo la línea superior
  const m = sheetModel([{ midi: 40 }, { midi: 64 }], null);
  ok(m[0].label === 'E2' && m[0].y === 75, `E2 mal: ${JSON.stringify(m[0])}`);
  ok(m[1].label === 'E4' && m[1].y === 5, `E4 mal: ${JSON.stringify(m[1])}`);
}
for (let root = 0; root < 12; root++) TPL.forEach((t, ti) => {
  const c = makeChord(root, ti), st = pickStart(c); if (!st) return;
  const notes = st.v.frets.map((f, k) => ({ midi: OPEN[st.v.s + k] + f }));
  checkSheet(notes, c, `${c.rootName}${t.sym}`);
});
for (let m = 40; m <= 79; m++) checkSheet([{ midi: m }], null, `nota ${m}`);
console.log(`formas con capo verificadas: ${capoV} (inversiones sin forma con capo: ${capoEmpty})`);
console.log(`notas de partitura verificadas: ${sheetChecked}`);
console.log(`nombres en inglés revisados: ${enNamed}`);
console.log(`comparaciones con fuerza bruta: ${agree}`);
console.log(`formas verificadas: ${totalV}`);
console.log(`combinaciones de 3-6 notas con nombre: ${combos}`);
console.log(`inversiones SIN ninguna forma tocable con tantas cuerdas como notas: ${emptyInv.length}`);
if (emptyInv.length) console.log('  ej.:', emptyInv.slice(0, 12).join(' | '));
console.log(`acordes del creador sin forma inicial: ${noStart.length}`, noStart.length ? noStart.slice(0, 12).join(' | ') : '');
console.log(`${checks} chequeos, ${fails} fallas`);
process.exit(fails ? 1 : 0);
