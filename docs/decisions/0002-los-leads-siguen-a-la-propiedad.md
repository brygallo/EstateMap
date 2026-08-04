# 0002 — Al transferir una propiedad, los leads la siguen

- **Fecha:** 2026-08-04
- **Estado:** aceptada
- **Reglas afectadas:** `OWN-003`, y las de visibilidad de leads en
  `specs/domains/leads.yaml` (`LEAD-005`)

## Contexto

Una propiedad puede cambiar de dueño en la plataforma. Los dos casos reales que
lo motivan:

- Alguien empieza a publicar, abandona, y el equipo publica el anuncio en su
  nombre. Cuando esa persona por fin tiene cuenta, hay que entregárselo.
- Un anuncio recopilado de un portal externo no tiene propietario
  (`owner = NULL`, `is_imported = True`). Si aparece su dueño real y reclama el
  anuncio, se le asigna.

En ambos casos la propiedad ya lleva tiempo publicada, y en ese tiempo ha podido
recibir leads: personas que dejaron su nombre, su teléfono y un mensaje
preguntando por ese inmueble.

Un lead es visible para el dueño de la propiedad sobre la que se dejó
(`LEAD-005`). Al mover `owner`, la pregunta es qué pasa con los leads anteriores
al cambio: si siguen a la propiedad, el nuevo dueño ve datos de contacto de
personas que escribieron cuando el anuncio era de otro; si se quedan con el dueño
anterior, el nuevo empieza a ciegas.

## Decisión

**Los leads siguen a la propiedad.** No se filtran por fecha de transferencia ni
se archivan: el nuevo propietario ve la bandeja completa del inmueble, y el
anterior deja de verla, porque la visibilidad se sigue derivando de `owner` y de
nada más.

## Por qué

Un lead es una pregunta sobre **un inmueble**, no sobre quien lo publicó. Su
texto es "¿sigue disponible el terreno de la vía a Sucúa?", no "quiero hablar
contigo". Quien tiene que contestar es quien puede vender hoy.

Partir el historial produce el peor resultado para las tres partes: el nuevo
dueño recibe otra vez preguntas que ya se contestaron y responde como si fueran
nuevas; el dueño anterior conserva contactos de un inmueble que ya no puede
vender; y quien preguntó recibe silencio o una respuesta repetida.

También pesa que ninguno de los dos casos que motivan la transferencia es una
venta del negocio a un tercero: en el primero, el "dueño anterior" es la propia
plataforma publicando en nombre de alguien; en el segundo no hay dueño anterior
en absoluto. En los dos, el nuevo propietario es la persona a la que esos leads
iban dirigidos desde el principio.

## La contrapartida, y por qué se acepta

El nuevo propietario ve los datos personales de quienes preguntaron antes de que
el anuncio fuese suyo, y esas personas no fueron consultadas.

Se acepta porque el propósito con el que dejaron sus datos —que alguien les
responda sobre ese inmueble— no cambia cuando cambia el titular; lo que cambia es
quién está en condiciones de cumplirlo. La finalidad del tratamiento sigue siendo
la misma, y no se amplía: los leads no se agregan a ninguna otra propiedad, no se
exportan y no se usan para nada distinto de responder esa consulta.

Lo que **no** se acepta, y por eso está en las reglas:

- La transferencia no la puede iniciar ninguna de las dos partes. Solo staff
  (`OWN-001`), y ni siquiera el propietario actual puede regalar su propiedad,
  precisamente porque hacerlo entregaría también la bandeja de leads.
- Cada transferencia queda escrita con actor, origen y destino (`OWN-006`), de
  modo que "quién vio estos datos y desde cuándo" tiene respuesta.
- El destinatario recibe un aviso (`OWN-006`). Un cambio hecho por otra persona
  sobre un bien tuyo tiene que ser algo que puedas discutir.

## Alternativas descartadas

**Que los leads se queden con el dueño anterior.** Deja al nuevo propietario sin
contexto y le hace repetir trabajo ya hecho. Además, el dueño anterior conserva
para siempre datos de un inmueble con el que ya no tiene relación, que es peor
resultado de privacidad que el que se pretendía evitar.

**Cortar por la fecha de transferencia: los anteriores se archivan, los nuevos
van al nuevo dueño.** Suena equilibrado y no lo es. Un lead de la semana pasada
sigue siendo una venta viva, y archivarlo la mata; el sistema acaba guardando
datos personales que ya no sirven a nadie, que es exactamente lo que no hay que
hacer.

**Pedir consentimiento a cada persona que dejó un lead.** Correcto en el papel e
inviable en la práctica: obliga a escribir a gente que preguntó por un terreno
hace meses para hacerle una pregunta administrativa que no entiende, y el
silencio —la respuesta mayoritaria garantizada— deja el lead en un limbo del que
no se sale.

## Consecuencias

- Al mover `owner`, no hay que tocar `Lead`: la visibilidad ya se deriva de la
  propiedad, así que el comportamiento sale solo. Lo que se añade son los tests
  que lo fijan (`OWN-003`), para que un cambio futuro en `LEAD-005` no lo altere
  sin darse cuenta.
- Si algún día se admite transferir entre inmobiliarias como operación
  comercial, esta decisión hay que revisarla: ahí sí habría dos empresas
  distintas y un traspaso de cartera, que es otro supuesto.
