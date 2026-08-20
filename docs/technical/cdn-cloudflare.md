# El CDN: qué pasa por Cloudflare y qué no

Desde agosto de 2026 el portal se sirve a través de Cloudflare (plan gratuito).
Este documento existe porque la decisión importante no es «poner un CDN», sino
**qué se deja fuera de él**: la máquina que sirve geopropiedadesecuador.com
sirve también aents.net, miyomehabla.com, el servidor de correo y MinIO, y
ninguno de esos está detrás del CDN. Un cambio pensado para el portal puede
tumbar el correo de la empresa.

## Qué está proxied y qué no

| Registro | Estado | Por qué |
| --- | --- | --- |
| `geopropiedadesecuador.com` | Proxied | Es la superficie pública: HTML, imágenes, sitemap. |
| `www` | Proxied | Redirige al ápice; tiene que ir por el mismo camino. |
| `api` | Proxied | Las lecturas públicas del catálogo son lo que más se cachea. |
| `mail` | **DNS only** | SMTP e IMAP no pasan por un proxy HTTP. Proxiarlo apaga el correo. |
| `minio` | **DNS only** | Las subidas y descargas de originales superan el límite de 100 MB del plan gratuito. |
| `console` | **DNS only** | Consola de MinIO, mismo motivo y sin tráfico público. |
| `MX`, `SPF`, `DKIM`, `DMARC` | **DNS only** | Registros de correo: proxiar cualquiera de ellos rompe la entrega. |

El panel de Cloudflare insiste con una recomendación —«tu IP de origen está
parcialmente expuesta, proxia todos los registros que comparten IP»— que **hay
que ignorar**. Los tres registros que no están proxiados no pueden estarlo, y
esconder la IP no es el objetivo de esta instalación.

## Lo que no se debe hacer

**No cerrar 80/443 a los rangos de Cloudflare en el firewall.** Es el consejo
habitual y aquí apaga tres sitios: aents.net y miyomehabla.com conservan sus
nameservers en GoDaddy y llegan directo al origen, igual que el correo y MinIO.
Si alguna vez hace falta cerrar el bypass, se cierra *por server block* —
`allow` de los rangos y `deny all` dentro de los dos bloques de
geopropiedades—, nunca en el firewall de la máquina.

**No crear una regla de caché sobre `/api/*`.** El backend marca cada respuesta:
las lecturas públicas salen con `public, s-maxage, stale-while-revalidate` y
todo lo demás sale `private, no-store` por defecto
(`real_estate/middleware_cache.py`). Una regla de «Cache Everything» sobre la
API ignora esa distinción y puede servirle a un visitante el panel de otro. La
configuración correcta es la de fábrica: respetar las cabeceras del origen.

**No activar Rocket Loader.** Reordena la carga de JavaScript y el mapa
(MapLibre) depende del orden.

**El modo SSL/TLS se queda en `Full`.** `Flexible` provoca un bucle de
redirecciones, porque nginx redirige :80 a :443 y Cloudflare volvería a pedir
:80. `Full (strict)` es mejor en teoría, pero deja el sitio a merced de la
renovación de Let's Encrypt: con `Full`, un certificado de origen caducado no
lo ven los visitantes. Subir a estricto solo después de comprobar una
renovación completa detrás del proxy (`certbot renew --dry-run`).

## Identidad del visitante

Este es el punto que rompe cosas en silencio. El límite anti-scraping
identifica al visitante por el último salto de `X-Forwarded-For`, que nginx
añade (`NUM_PROXIES=1`). Con un CDN delante, ese último salto pasa a ser el
edge, y un puñado de direcciones de edge sirven a una región entera: cientos de
personas compartirían un mismo cubo de 120 peticiones por minuto y empezarían a
ver 429 una tarde cualquiera.

`/etc/nginx/snippets/cloudflare-realip.conf` lo arregla antes de que Django vea
la petición. Se genera desde el repositorio y se reinstala en cada despliegue
(`deploy/install-edge-config.sh`), se refresca los lunes
(`deploy/cloudflare-ips-refresh.sh`) y se incluye **solo** dentro de los dos
bloques de geopropiedades. La cabecera `CF-Connecting-IP` únicamente se cree
cuando la conexión llega desde un rango de Cloudflare; comprobado enviándola
falsificada desde una conexión doméstica, el log siguió registrando la
dirección real.

## El render del servidor no sale a internet

El contenedor de Next.js pide sus datos a `https://api.geopropiedadesecuador.com`,
que ahora resuelve a un edge. Sin más, cada página renderizada saldría de
Ecuador, llegaría a Cloudflare y volvería a la misma máquina para leer su propia
base de datos.

`docker-compose.prod.yml` fija ese nombre a la puerta de enlace del host
(`extra_hosts`). La URL no cambia —mismo TLS, mismo certificado, mismo vhost—,
pero la petición no sale del servidor. El efecto secundario importante es que
una caída del CDN degrada a los visitantes, no al renderizado.

## Límites que hay que tener presentes

- **100 MB por petición** en el plan gratuito. `client_max_body_size` está en
  60 MB, por debajo del techo, y los originales pesados van a `minio`, que no
  está proxiado.
- **100 segundos de espera al origen** antes de un 524. nginx permite 300. Las
  rutas públicas medidas están todas por debajo de un segundo —el sitemap de
  3 MB tarda 0,34 s— así que hoy no hay ninguna en riesgo, pero un endpoint
  nuevo que tarde minutos fallará detrás del CDN aunque funcione en local.
- **El HTML no se cachea por defecto.** El nivel «Standard» solo guarda
  extensiones estáticas. Es lo que queremos hasta haber verificado la identidad
  del visitante; cachear antes es depurar dos problemas a la vez.
