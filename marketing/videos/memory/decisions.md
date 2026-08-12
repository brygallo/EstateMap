# Decisiones vigentes

Registro de decisiones estructurales de la fábrica.

## 2026-08-12 — Arquitectura inicial

- La CLI de Claude ya autenticada genera planes JSON estructurados, sin API adicional.
- Kokoro genera la voz local en español sin costo por generación.
- El proveedor TTS es intercambiable; ElevenLabs es una opción futura mediante variables de entorno.
- Remotion es el renderer visual compartido; FFmpeg queda para inspección y audio auxiliar.
- Remotion exporta el MP4 1080 × 1920; FFmpeg mide, convierte y mezcla recursos auxiliares.
- Los recursos reales suministrados por `--assets` tienen prioridad sobre fondos tipográficos.
- La publicación desde el producto queda fuera (`SOC-010`). En la fábrica editorial, una persona revisa y aprueba el MP4 final; después Claude abre TikTok con `agent-browser`, carga la pieza aprobada y la publica. El inicio de sesión, CAPTCHA o 2FA siguen siendo intervenciones humanas y las sesiones del navegador se cierran al terminar.
- Cada generación conserva sus intermedios para poder corregir una capa sin repetir todo.
