# Mástil: paquete para Google Play

Carpetas
- `site/` es la página web de la app (PWA). Esta carpeta es la que se sube a internet.
- `store-assets/` son las imágenes que pide la tienda: ícono 512, gráfico de función 1024x500 y 4 capturas de teléfono.
- `store-assets/listing.txt` tiene los textos de la ficha y las respuestas para los formularios de Play.

Pasos, en orden
1. Compra el dominio ANTES de generar la app de Android. La app queda amarrada a esa dirección y cambiarla después obliga a publicar una versión nueva.
2. Sube la carpeta `site/` a un hosting con https (Netlify o Cloudflare Pages dejan arrastrar la carpeta, sin GitHub) y conecta tu dominio.
3. Abre `site/privacy.html` y cambia las dos líneas que dicen PON AQUÍ TU CORREO por tu correo de contacto. Vuelve a subir.
4. Abre la dirección en Chrome del celular y revisa que ofrezca "Instalar app" y que abra sin internet.
5. Crea tu cuenta en Google Play Console y verifica tu identidad.
6. En pwabuilder.com pega tu dirección, elige Android / Google Play y descarga el paquete (.aab). Guarda bien la llave de firma que te da.
7. En Play Console, sube el .aab. Luego en Integridad de la app / Firma de apps copia la huella SHA-256 y pégala en `site/.well-known/assetlinks.json` (también el nombre del paquete). Vuelve a subir el sitio. Sin esto la app muestra una barra del navegador.
8. Cuenta personal nueva: Google exige una prueba cerrada con al menos 12 testers durante 14 días seguidos antes de pedir producción.
9. Decide gratis o de pago ANTES de publicar: una app gratis no se puede volver de pago después.
