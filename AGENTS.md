# Instrucciones para agentes

Este archivo existe para las herramientas que leen `AGENTS.md` por convención. El
contenido normativo es el mismo que carga Claude Code desde `CLAUDE.md`.

**Lee [`agents/CLAUDE.md`](agents/CLAUDE.md) antes de modificar comportamiento.**
Resume el contrato completo; lo que sigue son solo los puntos que más se incumplen.

## Lo mínimo que no puedes saltarte

1. Las reglas de negocio viven en `specs/`. Búscalas antes de escribir código.
   No inventes reglas: si falta una, escribe una propuesta en `specs/proposals/`.
2. Una regla con `status: implemented` **debe** citar `archivo:línea` con un
   símbolo que exista. Una regla `proposed` o `not_implemented` **no puede**
   citar nada. `tools/specs/validate.py` lo comprueba y CI lo bloquea.
3. Si el código tiene un defecto, escríbelo como dos reglas: una `implemented`
   con lo que hace hoy y otra `proposed` con lo que debería hacer. No lo maquilles.
4. La validación de verdad va en el backend. El frontend de este repo guarda los
   tokens en `localStorage` y lee `is_staff` de un JWT sin verificar firma: no es
   una frontera de seguridad.
5. `docs/generated/`, `backend/real_estate/tests/generated/` y `tests/generated/`
   se sobrescriben enteros. No los edites; edita el YAML y ejecuta
   `./scripts/specs.sh all`.
6. Una tarea no está terminada mientras código, tests y specs se contradigan.

## Convenciones del repositorio

- **Todo el código en inglés**: identificadores, comentarios, docstrings,
  mensajes de las herramientas, nombres de tests y aserciones. Mensajes de commit
  también. El español queda para lo que lee una persona: la interfaz, `docs/` y
  la prosa de las specs.
- Nunca hagas `git commit` sin que te lo pidan explícitamente.
- Nada de comentarios `{# … #}` ni `<!-- … -->` en plantillas Django: terminan
  visibles en la interfaz.
- El mapa es MapLibre; `react-leaflet` ya no está en el proyecto.
- En la interfaz se dice «Forma del terreno». Los contadores de visitas nunca se
  muestran en público.

## Skills obligatorias para copy comercial

- Usa `$copywriting` al crear o reescribir copy de páginas públicas: home,
  landing pages, páginas de funcionalidades, precios, producto, titulares,
  propuestas de valor y CTA. Antes de redactar, verifica público, objetivo,
  fuente de tráfico y una única acción principal.
- Usa `$ad-copy` para anuncios pagados en Meta, captions publicitarios, ganchos,
  variantes y guiones de video/UGC destinados a publicidad. Clasifica primero
  tráfico, nivel de conciencia, estrategia y formato; entrega los campos y
  límites propios del placement.
- Si un anuncio conduce a una página nueva o reescrita, usa primero
  `$copywriting` para fijar la promesa y el destino, y después `$ad-copy` para
  mantener concordancia entre anuncio y landing.
- Estas skills mejoran estructura y persuasión; no son fuente de hechos. Toda
  cifra, precio, ahorro, demanda, disponibilidad, capacidad, testimonio,
  autoridad, urgencia o prueba social debe estar respaldaldada por `specs/`, el
  código o una fuente aprobada. Si no existe evidencia, se omite.
- Una capacidad del producto solo puede ofrecerse si existe en el código y una
  spec `implemented` o `partial` describe honestamente su alcance. Una propuesta,
  experimento, mockup o intención nunca se presenta ni se insinúa como disponible.
- Usar una skill no autoriza publicar, gastar en pauta ni cambiar producto. La
  aprobación y la publicación siguen siendo pasos humanos explícitos.
- En video, el brief elige normalmente una duración de 18–45 s: 18 s para una
  demostración simple, 20–30 s para varios pasos o contexto y 31–45 s para un
  tutorial específico. No se agrega relleno para alcanzar una duración.

## Comandos

```bash
./scripts/specs.sh validate    # ¿specs y código siguen concordando?
./scripts/specs.sh all         # valida y regenera todo lo derivado
./scripts/specs.sh check       # lo que ejecuta CI
./run_tests.sh                 # suite del backend
cd tests && npx playwright test
```
