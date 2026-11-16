# Mástil: notas para Claude Code

Escríbele al usuario en español, directo, con pocos pasos y marcando riesgos. Si algo no se puede confirmar, dilo.

## Qué es
Mástil es un mástil de guitarra interactivo (6 cuerdas, 15 trastes, afinación estándar). Tocas celdas y la app muestra:
- 1 nota: nombre, octava y Hz.
- 2 notas: el intervalo.
- 3 o más notas: el acorde, con el papel de cada nota, y sus inversiones con diagramas.
Todo suena (cuerda pulsada sintetizada con Web Audio). Va a Google Play como PWA envuelta (Trusted Web Activity).

## Estructura esperada del repo
- `site/`: la app web. `index.html` es un solo archivo (HTML, CSS y JS a mano, sin build ni dependencias). Además `manifest.webmanifest`, `sw.js`, `privacy.html`, `fonts/`, `icons/`, `screenshots/` y `.well-known/assetlinks.json` (plantilla).
- `store-assets/`: ícono 512, gráfico 1024x500, 4 capturas 1080x1920 y `listing.txt` con textos y respuestas de formularios.
- `LEEME.md`: pasos hacia Play. Origen de todo: `mastil-pwa.zip`.

## Estado al 14 nov 2026
Hecho y probado en Chromium (instalable, abre sin internet, cero peticiones a otros sitios):
- App completa, PWA, fuentes propias (sin Google Fonts), íconos, política de privacidad, imágenes y textos de la ficha.
No probado: en celular real ni en Play Console.
Sin confirmar: si el repo `Fernando-Contreras/Fretboard` ya contiene este paquete. Tenía un `index.html` subido a mano, probablemente la versión sin PWA.

## Reglas de la app que no hay que romper
- Un conjunto de 3 o más notas distintas siempre recibe nombre de acorde (plantillas comunes y, si no hay, un nombre armado por intervalos). Con solo 2 nombres de nota distintos se muestra intervalo, no acorde.
- Las inversiones usan exactamente tantas cuerdas como notas seleccionadas, repitiendo notas del acorde si hace falta, y se siguen leyendo como el mismo acorde.
- `sw.js` guarda la app con un nombre de caché (`mastil-<hash>`). Si cambias CUALQUIER archivo de `site/`, cambia ese nombre; si no, los usuarios siguen viendo la versión vieja.
- Las pruebas que se corrieron (nombres para todas las combinaciones de 3 a 6 notas, inversiones que conservan el número de notas, modo offline) eran scripts sueltos y no están en el repo. Conviene agregarlos como `tests/`.

## Pendiente, en orden
1. Confirmar qué hay en el repo. Si falta el paquete, descomprimir `mastil-pwa.zip` y hacer commit y push.
2. Comprar dominio y publicar `site/` con https (Netlify o Cloudflare Pages). El dominio queda amarrado a la app de Android, así que va antes de generar el paquete.
3. Poner el correo de contacto en `site/privacy.html` (dos lugares con "PON AQUÍ" y "PUT YOUR"). No usar un correo sin preguntar al usuario.
4. Cuenta de Google Play Console (US$25 y verificación de identidad, a confirmar).
5. Generar el .aab con pwabuilder.com y guardar la llave de firma.
6. Poner nombre de paquete y huella SHA-256 en `site/.well-known/assetlinks.json` y republicar. Verificar que la URL abra.
7. Prueba cerrada: mínimo 12 testers con 14 días seguidos (cuenta personal nueva, según la ayuda oficial de Google Play).
8. Decidir gratis o de pago antes de publicar: una app gratis no puede volverse de pago después.
9. Formularios de Play: seguridad de datos, clasificación de contenido, público objetivo.

## Ideas posteriores (versión Pro)
Afinaciones alternativas (Drop D, DADGAD, 7 cuerdas, bajo, ukulele), modo zurdo, guardar acordes y progresiones, sonido de guitarra más realista.
