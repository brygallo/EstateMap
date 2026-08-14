# Música de la fábrica

Pistas para usar con `video render <id> --music assets/music/<pista>.mp3`.

Cada archivo lleva al lado su `<pista>.mp3.license.json` con título, autor,
fuente, licencia y la declaración `commercial_use: true` / `paid: false` que el
linter exige antes de mezclar nada. Sin ese sidecar, el render se niega.

## Origen

Todas vienen de la [música corporativa gratuita de Mixkit](https://mixkit.co/free-stock-music/corporate-music/),
bajo la [Mixkit Stock Music Free License](https://mixkit.co/license/#musicFree),
que permite usarlas en publicaciones y anuncios en redes, comerciales o no, sin
atribución obligatoria y sin pagar. No se pueden revender ni distribuir como
pistas sueltas, que no es lo que hacemos aquí.

| Pista | Autor | Duración | Carácter |
| --- | --- | --- | --- |
| `mixkit-close-up.mp3` | Michael Ramir C. | 1:35 | La aprobada: cálida y neutra. Suena en los videos 001, 002, 003 y 007 |
| `mixkit-raising-me-higher.mp3` | Ahjay Stelino | 1:38 | Ascendente, para piezas de resultado |
| `mixkit-motivating-mornings.mp3` | Ahjay Stelino | 1:36 | Clara y con pulso, para demostraciones |
| `mixkit-curiosity.mp3` | Diego Nava | 1:40 | Curiosa, para ganchos de pregunta |
| `mixkit-placeit-world-01.mp3` | Lily J | 1:36 | Ligera, para explicaciones |
| `mixkit-piano-reflections.mp3` | Ahjay Stelino | 3:19 | Piano tranquilo, para piezas educativas |
| `mixkit-relaxation-05.mp3` | Lily J | 1:58 | Calmada, para cierres largos |

## Reglas que no cambian

- **Nunca se compra ni se genera música.** Solo pistas gratuitas para uso
  comercial con su licencia archivada. Es una decisión registrada en
  `memory/decisions.md`.
- **Toda pieza se publica con música**, mezclada por debajo de la voz.
- Para añadir una pista nueva: descárgala, escribe su sidecar con los mismos
  campos y anótala en esta tabla.
