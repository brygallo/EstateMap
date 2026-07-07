# Ingesta de propiedades (agregador)

Recopila propiedades de otros portales de Ecuador (por scraping HTML) y las
carga en el mapa. **El scraping y la validación se hacen en LOCAL; producción
solo importa.** Diseño completo en [`PLAN.md`](./PLAN.md).

## Estado
- ✅ **Fase 0 — Fundaciones**: app, modelos, migración de `Property`, pipeline,
  paquete y los dos comandos.
- ✅ **Fase 1 — Properati EC**: scraper HTML end-to-end (verificado).
- ⬜ Fase 2 — Frontend (atribución, precio/área opcionales, contacto en cascada).
- ⬜ Fase 3 — Programación (cron) + caducidad. ⬜ Fase 4 — más portales.

## Requisitos (solo en el entorno de scraping / LOCAL)
```bash
pip install -r requirements-scraping.txt   # httpx (producción NO lo necesita)
```

## Uso

### 1) LOCAL — scrapear y generar el paquete
```bash
python manage.py ingesta_scrape --source properati                 # todo (terrenos, casas, ...)
python manage.py ingesta_scrape --source properati --limit 200     # prueba acotada
python manage.py ingesta_scrape --source properati --dry-run       # solo reporta, no escribe
```
Genera `paquetes/properati-AAAA-MM-DD/` con `listings.jsonl` + `images/`.
Solo entra lo que tiene ubicación válida en Ecuador.

### 2) PRODUCCIÓN — importar (el "un comando")
```bash
python manage.py ingesta_import paquetes/properati-2026-07-07
python manage.py ingesta_import paquetes/properati-2026-07-07 --expire   # caduca lo que ya no está
```
Idempotente: re-importar no duplica. Sube imágenes a MinIO.

### Utilidades
```bash
python manage.py ingesta_sources                        # lista fuentes/scrapers
python manage.py ingesta_sources --deactivate properati
python manage.py ingesta_stats                          # propiedades por fuente y su calidad
```

## Qué se captura de cada anuncio
`external_id`, `source_url`, título, descripción, **tipo** y **operación**
(estructurados), **precio** (opcional), **área** de terreno y **construida**,
**dormitorios/baños** (casas), **lat/lng** (del mapa del anuncio), provincia,
cantón, dirección, **inmobiliaria** (`source_agency`) e **imágenes**.
El teléfono en Properati está oculto → el contacto cae al enlace original.

## Añadir otro portal
Crear `scrapers/<portal>.py` con una clase que herede de `BaseScraper`,
decorada con `@register`, que implemente `scrape()` devolviendo dicts canónicos
(ver `scrapers/base.py`). Registrarla en `scrapers/__init__.py`. El resto del
pipeline (validación, dedup, imágenes, paquete, import) se reutiliza tal cual.
