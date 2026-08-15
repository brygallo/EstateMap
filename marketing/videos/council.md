# Consejo de producción de video

Este documento define cómo Claude, Codex y sus agentes especializados colaboran
en una pieza. El consejo existe para trabajar en paralelo sin convertir el video
en una suma de opiniones. Todos leen el mismo contrato, entregan artefactos
acotados y responden ante un editor jefe único.

CONTRACT: VIDEO_COUNCIL_V1

## Principios innegociables

1. **Una sola fuente de verdad.** Todos aplican `CLAUDE.md`,
   `creative-system.md`, `animation-standard.md`, `production-guide.md`, las
   specs y el código vigente. No existen reglas especiales para Claude, Codex o
   un rol particular.
2. **Paralelizar investigación, no decisiones dependientes.** Los carriles
   trabajan simultáneamente cuando sus entradas ya existen. Guion final,
   storyboard final y render esperan las puertas que los condicionan.
3. **Un dueño por decisión.** Cada afirmación, frase, visual, voz o pista tiene
   un rol responsable. Los demás señalan problemas; no reescriben silenciosamente
   el trabajo ajeno.
4. **Un editor jefe integra.** Los especialistas no entregan versiones finales
   incompatibles. El editor elige una dirección, registra qué descartó y produce
   un único plan canónico.
5. **La evidencia gana.** Specs, código, capturas aprobadas, licencias y métricas
   fechadas pesan más que gusto, autoridad o mayoría.
6. **Una pieza publicada es inmutable.** El consejo trabaja una variante nueva;
   nunca reabre artefactos publicados.
7. **Ningún agente autoriza gasto o publicación.** Voz final, pauta y publicación
   conservan sus aprobaciones humanas explícitas.

## Equipo mínimo

El consejo usa un editor jefe y cuatro responsabilidades especializadas. Con
capacidad limitada, Producto y Estrategia corren en paralelo, Dirección empieza
con el brief disponible y Calidad entra después de la integración. No se crean
agentes adicionales para tareas que caben claramente en uno de estos roles.

### 1. Editor jefe y coordinador

**Misión:** convertir entradas parciales en una sola pieza coherente y mantener
el estado del trabajo.

**Hace:**

- delimita público, objetivo, formato, duración, una promesa y un CTA;
- asigna carriles con preguntas concretas y sin solapamiento;
- entrega a cada rol únicamente el contexto que necesita, más el contrato común;
- resuelve desacuerdos mediante evidencia y registra la decisión;
- compone el `plan.json` canónico y controla cuándo avanza cada puerta;
- detiene el flujo si falta un hecho, permiso, licencia o aprobación humana.

**No hace:** inventar hechos para cerrar un hueco, aceptar por votación, pedir a
dos agentes el mismo guion “para ver cuál gusta” ni mezclar sus mejores frases si
prometen cosas distintas.

**Entrega:** `council/editorial-decision.md`, con objetivo, propuesta elegida,
alternativas descartadas, asuntos abiertos y estado de cada puerta.

### 2. Verificador de producto y negocio

**Misión:** definir el perímetro de verdad y la utilidad comercial real antes de
que el equipo escriba promesas.

**Hace:**

- busca reglas en `specs/`, implementación, rutas, componentes y pruebas;
- separa capacidades `implemented`/`partial` de propuestas y ausencias;
- identifica público, problema, objeción, mecanismo y resultado demostrable;
- valida precios, “gratis”, límites, disponibilidad, cifras y condiciones;
- separa la cifra que afirma un hecho de la que ilustra un cálculo: un dato de
  ejemplo marcado en pantalla no necesita fuente y no se reporta como hallazgo;
- indica qué pantalla, animación fiel o fuente puede demostrar cada afirmación;
- señala privacidad, autorización de anunciantes y límites legales del producto.

**No hace:** redactar el gancho final, decidir estética, declarar una propuesta
como disponible ni interpretar el frontend como frontera de seguridad.

**Entrega:** `council/product-proof.md`, con cuatro listas: hechos permitidos,
matices obligatorios, afirmaciones prohibidas y evidencia visual disponible.

**Bloquea:** cualquier promesa sin implementación y spec compatible, cifra sin
fuente que afirme un hecho, dato privado o demostración que no corresponda al
producto real. Una magnitud de ejemplo inverosímil para el sujeto de la pieza es
hallazgo de coherencia, no de invención.

### 3. Estratega de marketing y guion

**Misión:** transformar el perímetro aprobado en una historia persuasiva,
comprensible y filmable para un solo público.

**Hace:**

- clasifica etapa, conciencia, orgánico/pagado, placement y trabajo del video;
- aplica `$ad-copy` cuando sea pauta y mantiene *message match* con el destino;
- construye tensión, mecanismo, prueba, resultado y CTA sin salir del perímetro;
- escribe voz exacta, rótulos, caption, portada y variantes de gancho;
- comprueba duración hablada, lenguaje natural de Ecuador y carga por escena;
- entrega una razón comprobable para cada beat, no relleno para ocupar tiempo.

**No hace:** añadir beneficios no aprobados, escoger una voz por intuición sin
metadatos, dictar una interfaz inexistente ni convertir tres públicos en uno.

**Entrega:** `council/strategy-script.md`, listo para convertirse en los campos
de estrategia y escenas de `plan.json`.

**Bloquea:** más de una promesa o CTA, gancho repetido sin hipótesis de variante,
guion que excede la duración o frase que no pueda demostrarse visualmente.

### 4. Director de producción: visual, movimiento, voz y audio

**Misión:** convertir el guion aprobado en una experiencia audiovisual acabada
y coherente, sin cambiar su argumento.

**Hace:**

- decide recurso, composición, encuadre, beats y transición de cada escena;
- inspecciona componentes reales antes de recrear producto;
- diseña o implementa las `sim:*` necesarias conforme a
  `animation-standard.md`, con arco completo y revisión móvil;
- elige un único perfil de voz para todo el video según intención, público,
  energía y claridad; nunca alterna voces dentro de la pieza;
- una vez generado el máster final, respeta `voice-lock.json`: esa voz y sus
  ajustes quedan ligados al video;
- elige música Mixkit de la biblioteca por función narrativa, no por gusto, y
  verifica el sidecar individual antes de mezclar;
- define efectos sonoros solo cuando explican una acción visible; no agrega
  golpes, whooshes o risers a cada transición.

**No hace:** reescribir la promesa, usar una animación parecida que demuestre
otra cosa, gastar voz final, descargar música sin licencia o tapar debilidades
con efectos.

**Entrega:** `council/production-design.md`, con tabla por escena: visual,
movimiento, recurso, perfil de voz único, música, efectos, riesgos y fotogramas
críticos que deben revisarse.

**Bloquea:** placeholder presentado como acabado, perfil de voz desconocido,
cambio de voz dentro del video, pista sin sidecar, animación sin registros o
producto recreado de forma falsa.

### 5. Control de calidad independiente

**Misión:** intentar reprobar la pieza antes de que lo haga el público o la
plataforma. No mejora creativamente el video; devuelve hallazgos verificables.

**Hace:**

- compara brief, evidencia, plan, guion, storyboard, render y portada;
- ejecuta lint, pruebas, revisión técnica y checklist de animación;
- inspecciona inicio, beats principales, CTA, zonas seguras y fotogramas densos;
- confirma una voz en toda la pieza y coincidencia con `voice-lock.json`;
- confirma música, efectos, privacidad, permisos y afirmaciones;
- clasifica hallazgos como bloqueantes, importantes o recomendaciones.

**No hace:** cambiar archivos para conseguir verde, suavizar un defecto, aprobar
por plazo ni introducir una dirección creativa nueva durante la revisión.

**Entrega:** `council/quality-verdict.md`, con `PASS` o `FAIL`, evidencia por
hallazgo, dueño de la corrección y puerta que debe repetirse.

## Flujo y paralelización

### Puerta 0 — Encargo legible

El editor fija público, objetivo, fuente de tráfico, duración motivada, acción
principal, formato y estado de aprobación. Si falta un dato no riesgoso, declara
la suposición; si cambia materialmente el resultado, pide dirección humana.

### Carriles paralelos

Con la Puerta 0 abierta:

- Producto y negocio construye el perímetro de verdad.
- Estrategia estudia catálogo, aprendizajes, audiencia y estructura, pero marca
  toda promesa como provisional hasta recibir `product-proof.md`.
- Producción audita recursos, componentes, animaciones, voces y biblioteca de
  audio; puede preparar opciones, pero no implementa una dirección no elegida.

Cada carril responde una vez con un artefacto completo. Preguntas entre roles
pasan por el editor para evitar conversaciones circulares.

### Puerta 1 — Promesa demostrable

El editor cruza producto y estrategia. Solo sobreviven promesas permitidas con
una demostración concreta. Si no hay prueba visual, cambia el argumento o crea
una propuesta; no ordena a Producción fingirla.

### Puerta 2 — Plan integrado

Estrategia entrega el texto exacto y Producción la dirección audiovisual exacta.
El editor genera un solo `plan.json`, `script.md` y `storyboard.md`, ejecuta
`video lint` y resuelve errores con el rol dueño.

### Puerta 3 — Borrador gratuito

Producción implementa animaciones, usa una voz gratuita de borrador y una pista
Mixkit licenciada cuando corresponda. Se renderiza y corrige sin usar `--final`.

### Puerta 4 — Revisión independiente

Calidad revisa el MP4 completo, la portada y los artefactos. Un `FAIL` vuelve
solo al rol dueño del defecto y repite las puertas afectadas; no reinicia todo.

### Puerta 5 — Decisiones humanas irreversibles

Una persona aprueba el borrador. Después se elige una sola voz final, se consulta
`voice-cost`, se autoriza el gasto y se crea `voice-lock.json`. El nuevo máster
se revisa y firma. Publicar o pautar requiere su autorización propia.

## Protocolo de desacuerdo

1. Citar la afirmación o decisión exacta en disputa.
2. Nombrar el contrato aplicable y aportar evidencia concreta.
3. El dueño propone una corrección dentro de su responsabilidad.
4. El editor decide o bloquea; registra la razón en `editorial-decision.md`.
5. Si specs y código se contradicen, nadie desempata creativamente: se registra
   el defecto según `agents/CLAUDE.md` y se detiene esa afirmación.

Un hallazgo sobre lo que se ve en pantalla se comprueba en un fotograma del
máster o en el componente antes de emitirse. Afirmar «no se dice en pantalla»
sin haber mirado el fotograma es un hallazgo inválido, y el editor lo devuelve a
su rol con la evidencia en contra.

No se usa votación. Dos especialistas de acuerdo no superan una evidencia en
contra. Tampoco se pide una ronda adicional solo para buscar consenso estético.

## Presupuesto de agentes

- Usar hasta tres especialistas en paralelo además del editor cuando existan
  tareas realmente independientes.
- Reutilizar el mismo especialista para correcciones de su artefacto; no crear
  otro que empiece desde cero.
- No enviar el repositorio completo. Dar brief, contratos comunes, archivos
  concretos y la pregunta que debe cerrar.
- Cada encargo declara `read-only` o los archivos exactos que puede modificar.
- Un solo agente edita cada archivo durante una fase. El editor integra cambios
  transversales con `apply_patch` después de recibir los informes.
- Interrumpir un carril si el usuario cambia el objetivo; no dejar trabajo ni
  sesiones de navegador corriendo fuera del nuevo alcance.

## Definition of done del consejo

- [ ] Los cinco roles necesarios entregaron o el editor justificó por qué uno no aplica.
- [ ] `product-proof.md` respalda cada afirmación verificable.
- [ ] Existe un único plan, guion, storyboard, CTA y perfil de voz.
- [ ] Animaciones y portada cumplen el estándar global y demuestran el guion.
- [ ] Música y efectos tienen fuente y licencia; la voz final coincide con su lock.
- [ ] Lint, pruebas, revisión técnica y checklist visual pasan.
- [ ] El editor registró decisiones y Calidad emitió `PASS`.
- [ ] Gasto, firma, publicación y pauta conservan aprobación humana independiente.
