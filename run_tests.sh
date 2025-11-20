#!/bin/bash

# Script para ejecutar tests del proyecto EstateMap
# Uso: ./run_tests.sh [opciones]

set -e

echo "================================================"
echo "  EstateMap - Suite de Tests"
echo "================================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo "Uso: ./run_tests.sh [opción]"
    echo ""
    echo "Opciones:"
    echo "  all              Ejecutar todos los tests (default)"
    echo "  registration     Tests de registro y verificación"
    echo "  password-reset   Tests de reset de contraseña"
    echo "  email-change     Tests de cambio de email"
    echo "  auth             Tests de autenticación y login"
    echo "  coverage         Ejecutar tests con reporte de cobertura"
    echo "  watch            Ejecutar tests en modo watch"
    echo "  fast             Ejecutar solo tests rápidos"
    echo "  failed           Re-ejecutar solo tests fallidos"
    echo "  verbose          Ejecutar con output verbose"
    echo "  help             Mostrar esta ayuda"
    echo ""
}

# Verificar que Docker esté corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker no está corriendo"
    exit 1
fi

# Función principal para ejecutar tests
run_tests() {
    local test_args="$1"
    local description="$2"

    echo -e "${BLUE}📋 Ejecutando: $description${NC}"
    echo ""

    docker-compose run --rm backend pytest $test_args

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Tests completados exitosamente${NC}"
    else
        echo ""
        echo -e "${YELLOW}⚠️  Algunos tests fallaron (código de salida: $exit_code)${NC}"
    fi

    return $exit_code
}

# Procesar argumentos
case "${1:-all}" in
    all)
        run_tests "real_estate/tests/" "Todos los tests"
        ;;

    registration)
        run_tests "real_estate/tests/test_registration.py" "Tests de registro y verificación"
        ;;

    password-reset)
        run_tests "real_estate/tests/test_password_reset.py" "Tests de reset de contraseña"
        ;;

    email-change)
        run_tests "real_estate/tests/test_email_change.py" "Tests de cambio de email"
        ;;

    auth)
        run_tests "real_estate/tests/test_authentication.py" "Tests de autenticación"
        ;;

    coverage)
        echo -e "${BLUE}📊 Ejecutando tests con cobertura${NC}"
        echo ""
        docker-compose run --rm backend pytest real_estate/tests/ \
            --cov=real_estate \
            --cov-report=html \
            --cov-report=term-missing
        echo ""
        echo -e "${GREEN}📈 Reporte de cobertura generado en: backend/htmlcov/index.html${NC}"
        ;;

    watch)
        echo -e "${BLUE}👀 Modo watch activado (Ctrl+C para salir)${NC}"
        echo ""
        docker-compose run --rm backend pytest real_estate/tests/ -f
        ;;

    fast)
        run_tests "real_estate/tests/ -m 'not slow'" "Tests rápidos"
        ;;

    failed)
        run_tests "real_estate/tests/ --lf" "Re-ejecutar tests fallidos"
        ;;

    verbose)
        run_tests "real_estate/tests/ -vv" "Tests con output verbose"
        ;;

    help)
        show_help
        ;;

    *)
        echo "❌ Opción no reconocida: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

echo ""
echo "================================================"
