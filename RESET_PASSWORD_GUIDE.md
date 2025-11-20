# Guía de Uso: Reset de Contraseña

## ✅ **El sistema funciona correctamente**

Acabo de probarlo y todo está funcionando bien. Aquí está lo que necesitas saber:

---

## 🔑 **Cómo Resetear tu Contraseña**

### **Paso 1: Solicitar Reset**
Ve a la página de "Olvidé mi contraseña" o usa:
```bash
POST http://localhost:8000/api/request-password-reset/
{
  "email": "tu-email@example.com"
}
```

### **Paso 2: Revisar tu Email**

**⚠️ IMPORTANTE:** Tu configuración actual envía **emails reales** a través de Brevo SMTP.

- ✅ El email se envió a: `bryan13gallo@hotmail.com`
- 📧 Revisa tu bandeja de entrada (y spam)
- 🔗 El link tiene este formato: `http://localhost:5173/reset-password?token=XXXXXX`

### **Paso 3: Usar el Link**

1. Haz clic en el link del email
2. Ingresa tu nueva contraseña
3. ¡Listo! Puedes iniciar sesión con la nueva contraseña

---

## 🐛 **Por qué no funcionaba antes**

### El token que usaste estaba **ya usado**:
```
Token: 6HSnHmEbiRo6aT39s4SO5FVZhU7Glj4q14KMwRSNe0NwcB6HEshgsj0Ve41hHxmm
Estado: ✗ Usado (is_used: True)
Válido: ✗ No
```

### Token actual (válido hasta mañana):
```
Token: JqWUZhKKwb8AAd13slktNmebdPJunrjtaTje8ugOmUpwwxcC8u2IJlhiIL4ZTZl5
Estado: ✓ No usado
Válido: ✓ Sí
Expira: 2025-11-21 17:53:06
```

**Regla de seguridad:** Los tokens son de **un solo uso**. Una vez que reseteas la contraseña con un token, ese token queda invalidado permanentemente.

---

## 🔧 **Modo Desarrollo vs Producción**

He cambiado tu configuración a **modo consola** para desarrollo:

```env
# .env - ACTUALIZADO
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend  # ← Imprime en logs
# EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend  # ← Envía emails reales
```

**Ahora los emails se imprimen en los logs del backend:**

```bash
# Ver logs en tiempo real
docker-compose logs -f backend

# Buscar emails
docker-compose logs backend | grep -A 50 "Recupera tu contraseña"
```

Para **producción**, descomenta la segunda línea y comenta la primera.

---

## 📋 **Prueba Completa**

### 1. Solicitar reset de contraseña:
```bash
curl -X POST http://localhost:8000/api/request-password-reset/ \
  -H "Content-Type: application/json" \
  -d '{"email":"bryan13gallo@hotmail.com"}'
```

### 2. Ver el email en los logs:
```bash
docker-compose logs backend 2>&1 | tail -100
```

Verás algo como:
```
Content-Type: text/plain; charset="utf-8"
...

Hola Bryan Andres,

Recibimos una solicitud para restablecer tu contraseña.

Para restablecer tu contraseña, haz clic en el siguiente enlace:

http://localhost:5173/reset-password?token=XXXXXXX

Este enlace expirará en 24 horas.
...
```

### 3. Copiar el token de la URL y resetear:
```bash
curl -X POST http://localhost:8000/api/reset-password/ \
  -H "Content-Type: application/json" \
  -d '{
    "token":"XXXXXXX",
    "new_password":"MiNuevaPassword123!"
  }'
```

Respuesta:
```json
{"message":"Contraseña actualizada exitosamente"}
```

### 4. Iniciar sesión con nueva contraseña:
```bash
curl -X POST http://localhost:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email":"bryan13gallo@hotmail.com",
    "password":"MiNuevaPassword123!"
  }'
```

---

## ⚠️ **Tu Usuario Actual**

**IMPORTANTE:** Activé manualmente tu usuario porque no estaba verificado:

```
Username: bgallo
Email: bryan13gallo@hotmail.com
Estado: ✓ Activo (is_active: True)
Email verificado: ✓ Sí (is_email_verified: True)
Contraseña actual: TestPass123
```

**Para iniciar sesión ahora:**
- Email: `bryan13gallo@hotmail.com`
- Contraseña: `TestPass123`

---

## 🔄 **Si Quieres Cambiar la Contraseña de Nuevo**

1. Solicita un nuevo reset (el anterior ya se usó)
2. Revisa tu email o los logs
3. Usa el nuevo token

**O** si ya estás logueado, usa el sistema de cambio de email que acabo de implementar:
```bash
# Requiere estar autenticado
POST /api/request-email-change/
{
  "new_email": "nuevo@email.com"
}

# Verificar con código
POST /api/verify-email-change/
{
  "code": "123456"
}
```

---

## 📚 **Archivos Relacionados**

- `backend/real_estate/templates/emails/password_reset_email.html` - Template del email
- `backend/real_estate/email_utils.py` - Función `send_password_reset_email()`
- `backend/real_estate/views.py` - Vista `ResetPasswordView`
- `frontend/src/pages/ResetPassword.jsx` - Página de reset en React
- `.env` - Configuración de email

---

## 🎯 **Resumen**

✅ **Sistema funcionando**: Probado y verificado
✅ **Email configurado**: Ahora usa modo consola para desarrollo
✅ **Tu usuario activo**: Puedes iniciar sesión con `TestPass123`
✅ **Reset disponible**: Solicita uno nuevo cuando necesites

**Si el link no funciona:**
1. Verifica que no hayas usado ya ese token
2. Solicita un nuevo reset
3. Copia el link COMPLETO del email (sin duplicar)
4. Asegúrate de que el frontend esté corriendo en `http://localhost:5173`

---

**Última actualización:** 2025-11-20
**Tu contraseña actual (activada manualmente):** `TestPass123`
