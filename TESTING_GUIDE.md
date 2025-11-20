# Guía de Testing - EstateMap

Documentación completa para ejecutar y mantener los tests automatizados del proyecto.

---

## 📋 **Índice**

1. [¿Qué se está testeando?](#qué-se-está-testeando)
2. [Instalación](#instalación)
3. [Ejecutar Tests](#ejecutar-tests)
4. [Estructura de Tests](#estructura-de-tests)
5. [Escribir Nuevos Tests](#escribir-nuevos-tests)
6. [Fixtures Disponibles](#fixtures-disponibles)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 **¿Qué se está testeando?**

### **Total: 50+ tests automatizados**

| Módulo | Tests | Cobertura |
|--------|-------|-----------|
| **Registro de Usuario** | 8 tests | ✅ Registro, validaciones, emails |
| **Verificación de Email** | 9 tests | ✅ Códigos, expiración, reenvío |
| **Reset de Contraseña** | 10 tests | ✅ Solicitud, verificación, tokens |
| **Cambio de Email** | 12 tests | ✅ Request, verificación, notificaciones |
| **Autenticación/Login** | 11 tests | ✅ Login, JWT tokens, permisos |

### **Funcionalidades Cubiertas**

✅ Registro de usuario con email
✅ Verificación de email con código de 6 dígitos
✅ Envío de email de bienvenida
✅ Reset de contraseña con token seguro
✅ Cambio de email con verificación en 2 pasos
✅ Login con email y contraseña
✅ Autenticación con JWT tokens
✅ Validaciones de seguridad (tokens expirados, usados, etc.)
✅ Envío de emails (verificación, bienvenida, reset, cambio)

---

## 📦 **Instalación**

### **1. Instalar Dependencias**

```bash
# Opción A: Rebuild completo del contenedor
docker-compose build backend

# Opción B: Instalar en contenedor existente
docker-compose run --rm backend pip install -r requirements.txt
```

### **2. Verificar Instalación**

```bash
docker-compose run --rm backend pytest --version
```

Deberías ver:
```
pytest 7.4.x
```

---

## 🚀 **Ejecutar Tests**

### **Método Rápido (Script)**

```bash
# Todos los tests
./run_tests.sh

# Tests específicos
./run_tests.sh registration      # Solo registro
./run_tests.sh password-reset    # Solo reset de password
./run_tests.sh email-change      # Solo cambio de email
./run_tests.sh auth              # Solo autenticación

# Con cobertura
./run_tests.sh coverage

# Modo watch (re-ejecuta al cambiar archivos)
./run_tests.sh watch

# Solo tests fallidos
./run_tests.sh failed

# Verbose (más detalles)
./run_tests.sh verbose

# Ver ayuda
./run_tests.sh help
```

### **Método Manual (Docker Compose)**

```bash
# Todos los tests
docker-compose run --rm backend pytest real_estate/tests/

# Test específico
docker-compose run --rm backend pytest real_estate/tests/test_registration.py

# Test de una clase específica
docker-compose run --rm backend pytest real_estate/tests/test_registration.py::TestUserRegistration

# Test de una función específica
docker-compose run --rm backend pytest real_estate/tests/test_registration.py::TestUserRegistration::test_register_user_success

# Con verbose
docker-compose run --rm backend pytest real_estate/tests/ -v

# Solo tests marcados
docker-compose run --rm backend pytest -m auth  # Solo tests de autenticación
docker-compose run --rm backend pytest -m email  # Solo tests de email

# Tests paralelos (más rápido)
docker-compose run --rm backend pytest real_estate/tests/ -n auto
```

### **Cobertura de Código**

```bash
# Generar reporte de cobertura
./run_tests.sh coverage

# Ver reporte en terminal
docker-compose run --rm backend pytest real_estate/tests/ \
  --cov=real_estate \
  --cov-report=term-missing

# Generar reporte HTML
docker-compose run --rm backend pytest real_estate/tests/ \
  --cov=real_estate \
  --cov-report=html

# Abrir reporte en navegador
open backend/htmlcov/index.html
```

---

## 📁 **Estructura de Tests**

```
backend/
├── pytest.ini                              # Configuración de pytest
├── requirements.txt                        # Incluye pytest y dependencias
└── real_estate/
    └── tests/
        ├── __init__.py                     # Package de tests
        ├── conftest.py                     # Fixtures compartidos
        ├── test_registration.py            # Tests de registro (8 tests)
        ├── test_password_reset.py          # Tests de reset (10 tests)
        ├── test_email_change.py            # Tests de cambio email (12 tests)
        └── test_authentication.py          # Tests de auth (11 tests)
```

### **Descripción de Archivos**

#### **conftest.py** - Fixtures compartidos
```python
api_client              # Cliente API para hacer requests
user_data               # Datos de ejemplo para crear usuarios
create_user             # Factory para crear usuarios
authenticated_client    # Cliente con usuario autenticado
clear_mailbox          # Limpiar bandeja de emails de prueba
```

#### **test_registration.py**
- ✅ Registro exitoso
- ✅ Email duplicado
- ✅ Contraseña débil
- ✅ Campos requeridos
- ✅ Verificación de email
- ✅ Código inválido/expirado
- ✅ Reenvío de código
- ✅ Email de bienvenida

#### **test_password_reset.py**
- ✅ Solicitud de reset
- ✅ Email no existente
- ✅ Invalidación de tokens anteriores
- ✅ Reset con token válido
- ✅ Token inválido/expirado/usado
- ✅ Contraseña débil
- ✅ Validación del modelo

#### **test_email_change.py**
- ✅ Solicitar cambio de email
- ✅ Requiere autenticación
- ✅ Email duplicado/mismo email
- ✅ Invalidación de tokens
- ✅ Verificación exitosa
- ✅ Código inválido/expirado
- ✅ Email ya tomado después
- ✅ Notificación al email antiguo

#### **test_authentication.py**
- ✅ Login exitoso
- ✅ Contraseña incorrecta
- ✅ Email no existente
- ✅ Usuario inactivo
- ✅ Campos faltantes
- ✅ JWT token válido
- ✅ Requests autenticados
- ✅ Modelo de usuario

---

## ✍️ **Escribir Nuevos Tests**

### **Template Básico**

```python
import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
@pytest.mark.auth  # Marker opcional
class TestMiFuncionalidad:
    """Tests para mi funcionalidad"""

    def test_caso_exitoso(self, api_client, create_user):
        """Test del caso feliz"""
        # Arrange (Preparar)
        user = create_user()
        url = reverse('mi-endpoint')

        # Act (Actuar)
        response = api_client.post(url, {'data': 'value'})

        # Assert (Verificar)
        assert response.status_code == status.HTTP_200_OK
        assert 'esperado' in response.data

    def test_caso_error(self, api_client):
        """Test de caso de error"""
        url = reverse('mi-endpoint')
        response = api_client.post(url, {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
```

### **Markers Disponibles**

```python
@pytest.mark.django_db      # Requiere acceso a DB
@pytest.mark.auth           # Test de autenticación
@pytest.mark.email          # Test relacionado con emails
@pytest.mark.unit           # Test unitario
@pytest.mark.integration    # Test de integración
@pytest.mark.slow           # Test lento (para skip con --fast)
```

---

## 🔧 **Fixtures Disponibles**

### **api_client**
Cliente para hacer requests HTTP.

```python
def test_example(api_client):
    response = api_client.get('/api/endpoint/')
    assert response.status_code == 200
```

### **create_user**
Factory para crear usuarios de prueba.

```python
def test_example(create_user):
    user = create_user(
        email='test@example.com',
        password='TestPass123!',
        is_active=True
    )
    assert user.email == 'test@example.com'
```

### **authenticated_client**
Cliente con usuario ya autenticado.

```python
def test_example(authenticated_client):
    # Ya tiene token JWT configurado
    response = authenticated_client.get('/api/protected/')
    assert response.status_code == 200

    # Acceder al usuario
    user = authenticated_client.user
```

### **user_data**
Datos de ejemplo para crear usuarios.

```python
def test_example(api_client, user_data):
    response = api_client.post('/api/register/', user_data)
    assert response.status_code == 201
```

### **clear_mailbox**
Limpia y retorna la bandeja de emails de prueba.

```python
def test_example(api_client, clear_mailbox):
    # Realizar acción que envía email
    api_client.post('/api/register/', data)

    # Verificar email
    assert len(mail.outbox) == 1
    assert 'Bienvenido' in mail.outbox[0].subject
```

---

## 📝 **Best Practices**

### **1. Nomenclatura Clara**

```python
# ✅ Bueno
def test_user_cannot_login_with_wrong_password():
    pass

# ❌ Malo
def test_login():
    pass
```

### **2. Un Assert por Concepto**

```python
# ✅ Bueno
def test_registration_creates_user():
    response = api_client.post(url, data)
    assert response.status_code == 201

def test_registration_sends_email():
    response = api_client.post(url, data)
    assert len(mail.outbox) == 1

# ❌ Malo (mezcla varios conceptos)
def test_registration():
    response = api_client.post(url, data)
    assert response.status_code == 201
    assert len(mail.outbox) == 1
    assert User.objects.count() == 1
```

### **3. Arrange-Act-Assert**

```python
def test_example(api_client, create_user):
    # Arrange (Preparar)
    user = create_user()
    url = reverse('endpoint')
    data = {'key': 'value'}

    # Act (Actuar)
    response = api_client.post(url, data)

    # Assert (Verificar)
    assert response.status_code == 200
```

### **4. Fixtures para Reutilización**

```python
# En conftest.py
@pytest.fixture
def verified_user(create_user):
    return create_user(is_email_verified=True)

# En tests
def test_something(verified_user):
    assert verified_user.is_email_verified is True
```

### **5. Usar Markers**

```python
@pytest.mark.django_db
@pytest.mark.email
@pytest.mark.slow
def test_bulk_email_sending():
    pass
```

---

## 🐛 **Troubleshooting**

### **Error: "No module named pytest"**

```bash
# Reinstalar dependencias
docker-compose build backend
# o
docker-compose run --rm backend pip install -r requirements.txt
```

### **Error: "Database access not allowed"**

Agregar el marker `@pytest.mark.django_db`:

```python
@pytest.mark.django_db
def test_mi_funcion():
    pass
```

### **Tests Lentos**

```bash
# Ejecutar tests en paralelo
docker-compose run --rm backend pytest real_estate/tests/ -n auto

# Saltar tests lentos
./run_tests.sh fast
```

### **Ver Output de Print**

```bash
# Usar -s para ver prints
docker-compose run --rm backend pytest real_estate/tests/ -s

# Usar -vv para más verbosidad
docker-compose run --rm backend pytest real_estate/tests/ -vv
```

### **Limpiar Cache de Pytest**

```bash
docker-compose run --rm backend pytest --cache-clear
```

### **Re-ejecutar Solo Tests Fallidos**

```bash
./run_tests.sh failed
# o
docker-compose run --rm backend pytest --lf
```

---

## 📊 **Métricas del Proyecto**

### **Cobertura Actual**

```bash
# Ver cobertura
./run_tests.sh coverage
```

**Meta:** ≥ 80% de cobertura de código

### **Tiempos de Ejecución**

- Suite completa: ~30-60 segundos
- Tests de registro: ~8 segundos
- Tests de auth: ~6 segundos
- Tests de email: ~10 segundos

### **CI/CD Integration**

Para integrar con GitHub Actions / GitLab CI:

```yaml
# .github/workflows/tests.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: |
          docker-compose build
          docker-compose run --rm backend pytest real_estate/tests/ --cov
```

---

## 🔗 **Enlaces Útiles**

- **Pytest Docs:** https://docs.pytest.org/
- **Pytest-Django:** https://pytest-django.readthedocs.io/
- **DRF Testing:** https://www.django-rest-framework.org/api-guide/testing/
- **Factory Boy:** https://factoryboy.readthedocs.io/

---

## 📞 **Soporte**

Si encuentras problemas con los tests:

1. Revisa esta guía
2. Verifica los logs: `docker-compose logs backend`
3. Limpia cache: `pytest --cache-clear`
4. Rebuild contenedor: `docker-compose build backend`

---

**Última actualización:** 2025-11-20
**Versión:** 1.0.0
**Autor:** Equipo de Desarrollo EstateMap
