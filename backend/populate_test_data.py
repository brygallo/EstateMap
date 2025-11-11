"""
Script para poblar la base de datos con usuarios y propiedades de prueba
"""
import os
import django
import sys

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estate_map.settings')
django.setup()

from django.contrib.auth import get_user_model
from real_estate.models import Property, PropertyImage

User = get_user_model()

def clear_database():
    """Elimina todos los usuarios y propiedades"""
    print("🗑️  Eliminando datos existentes...")
    PropertyImage.objects.all().delete()
    Property.objects.all().delete()
    User.objects.all().delete()
    print("✅ Base de datos limpiada")

def create_test_users():
    """Crea usuarios de prueba"""
    print("\n👥 Creando usuarios de prueba...")

    users_data = [
        {
            "username": "admin",
            "email": "admin@estatemap.com",
            "password": "admin123",
            "first_name": "Admin",
            "last_name": "EstateMap",
            "is_staff": True,
            "is_superuser": True
        },
        {
            "username": "maria_garcia",
            "email": "maria.garcia@email.com",
            "password": "maria123",
            "first_name": "María",
            "last_name": "García"
        },
        {
            "username": "juan_lopez",
            "email": "juan.lopez@email.com",
            "password": "juan123",
            "first_name": "Juan",
            "last_name": "López"
        },
        {
            "username": "ana_rodriguez",
            "email": "ana.rodriguez@email.com",
            "password": "ana123",
            "first_name": "Ana",
            "last_name": "Rodríguez"
        },
        {
            "username": "carlos_martinez",
            "email": "carlos.martinez@email.com",
            "password": "carlos123",
            "first_name": "Carlos",
            "last_name": "Martínez"
        }
    ]

    users = {}
    for user_data in users_data:
        password = user_data.pop('password')
        user = User.objects.create_user(**user_data)
        user.set_password(password)
        user.save()
        users[user.username] = user
        print(f"  ✓ Usuario creado: {user.username} ({user.email})")

    return users

def create_test_properties(users):
    """Crea propiedades de prueba"""
    print("\n🏡 Creando propiedades de prueba...")

    properties_data = [
        # Propiedades de María García
        {
            "owner": users["maria_garcia"],
            "title": "Casa Moderna en Centro de Macas",
            "description": "Hermosa casa de 2 plantas con acabados de primera calidad. Ubicada en zona céntrica, cerca de colegios y supermercados. Ideal para familias.",
            "property_type": "house",
            "status": "for_sale",
            "address": "Av. 29 de Mayo y Sucre",
            "city": "Macas",
            "province": "Morona Santiago",
            "latitude": -2.3089,
            "longitude": -78.1156,
            "area": 250.0,
            "built_area": 180.0,
            "rooms": 4,
            "bathrooms": 3,
            "parking_spaces": 2,
            "floors": 2,
            "furnished": False,
            "year_built": 2020,
            "price": 125000.00,
            "is_negotiable": True,
            "contact_phone": "+593 99 123 4567"
        },
        {
            "owner": users["maria_garcia"],
            "title": "Terreno Comercial Avenida Principal",
            "description": "Excelente terreno para desarrollo comercial. Ubicación estratégica en la avenida principal con alto flujo vehicular.",
            "property_type": "land",
            "status": "for_sale",
            "address": "Av. Don Bosco Km 2",
            "city": "Macas",
            "province": "Morona Santiago",
            "latitude": -2.2987,
            "longitude": -78.1234,
            "area": 500.0,
            "rooms": 0,
            "bathrooms": 0,
            "parking_spaces": 0,
            "price": 95000.00,
            "is_negotiable": True,
            "contact_phone": "+593 99 123 4567",
            "polygon": {
                "type": "Polygon",
                "coordinates": [[
                    [-78.1234, -2.2987],
                    [-78.1230, -2.2987],
                    [-78.1230, -2.2990],
                    [-78.1234, -2.2990],
                    [-78.1234, -2.2987]
                ]]
            }
        },

        # Propiedades de Juan López
        {
            "owner": users["juan_lopez"],
            "title": "Departamento Amoblado Cerca del Parque",
            "description": "Acogedor departamento completamente amoblado, perfecto para profesionales o parejas. Excelente ubicación cerca del parque central.",
            "property_type": "apartment",
            "status": "for_rent",
            "address": "Calle Bolívar 123",
            "city": "Macas",
            "province": "Morona Santiago",
            "latitude": -2.3067,
            "longitude": -78.1178,
            "area": 85.0,
            "built_area": 85.0,
            "rooms": 2,
            "bathrooms": 1,
            "parking_spaces": 1,
            "furnished": True,
            "year_built": 2018,
            "price": 350.00,
            "is_negotiable": False,
            "contact_phone": "+593 98 765 4321"
        },
        {
            "owner": users["juan_lopez"],
            "title": "Local Comercial en Zona Turística",
            "description": "Amplio local comercial ideal para restaurante, cafetería o tienda. Ubicado en zona de alto tránsito turístico.",
            "property_type": "commercial",
            "status": "for_rent",
            "address": "Av. Amazonas y 24 de Mayo",
            "city": "Macas",
            "province": "Morona Santiago",
            "latitude": -2.3045,
            "longitude": -78.1145,
            "area": 120.0,
            "built_area": 120.0,
            "rooms": 0,
            "bathrooms": 2,
            "parking_spaces": 0,
            "year_built": 2019,
            "price": 800.00,
            "is_negotiable": True,
            "contact_phone": "+593 98 765 4321"
        },

        # Propiedades de Ana Rodríguez
        {
            "owner": users["ana_rodriguez"],
            "title": "Quinta con Piscina y Áreas Verdes",
            "description": "Hermosa quinta de descanso con piscina, áreas verdes y vista panorámica. Ideal para eventos o vivienda familiar.",
            "property_type": "house",
            "status": "for_sale",
            "address": "Vía Macas - Puyo Km 5",
            "city": "Macas",
            "province": "Morona Santiago",
            "latitude": -2.2756,
            "longitude": -78.0987,
            "area": 2000.0,
            "built_area": 300.0,
            "rooms": 5,
            "bathrooms": 4,
            "parking_spaces": 4,
            "floors": 2,
            "furnished": True,
            "year_built": 2015,
            "price": 285000.00,
            "is_negotiable": True,
            "contact_phone": "+593 97 555 1234"
        },
        {
            "owner": users["ana_rodriguez"],
            "title": "Terreno Agrícola con Río",
            "description": "Extenso terreno agrícola con acceso a río. Perfecto para proyectos de agricultura, ganadería o ecoturismo.",
            "property_type": "land",
            "status": "for_sale",
            "address": "Sector San José de Morona",
            "city": "Macas",
            "province": "Morona Santiago",
            "latitude": -2.3456,
            "longitude": -78.0876,
            "area": 10000.0,
            "rooms": 0,
            "bathrooms": 0,
            "parking_spaces": 0,
            "price": 45000.00,
            "is_negotiable": True,
            "contact_phone": "+593 97 555 1234",
            "polygon": {
                "type": "Polygon",
                "coordinates": [[
                    [-78.0876, -2.3456],
                    [-78.0856, -2.3456],
                    [-78.0856, -2.3486],
                    [-78.0876, -2.3486],
                    [-78.0876, -2.3456]
                ]]
            }
        },

        # Propiedades de Carlos Martínez
        {
            "owner": users["carlos_martinez"],
            "title": "Casa Acogedora con Jardín",
            "description": "Casa familiar de una planta con amplio jardín y zona de BBQ. Barrio tranquilo y seguro, ideal para familias con niños.",
            "property_type": "house",
            "status": "for_sale",
            "address": "Barrio Los Pinos, Calle Las Orquídeas",
            "city": "Macas",
            "province": "Morona Santiago",
            "latitude": -2.3123,
            "longitude": -78.1089,
            "area": 180.0,
            "built_area": 120.0,
            "rooms": 3,
            "bathrooms": 2,
            "parking_spaces": 1,
            "floors": 1,
            "furnished": False,
            "year_built": 2017,
            "price": 89000.00,
            "is_negotiable": True,
            "contact_phone": "+593 96 888 9999"
        },
        {
            "owner": users["carlos_martinez"],
            "title": "Apartamento Nuevo en Edificio Moderno",
            "description": "Apartamento de estreno en edificio con seguridad 24/7, ascensor y áreas comunales. Excelente inversión.",
            "property_type": "apartment",
            "status": "for_sale",
            "address": "Edificio Torre del Sol, Piso 5",
            "city": "Macas",
            "province": "Morona Santiago",
            "latitude": -2.3098,
            "longitude": -78.1167,
            "area": 95.0,
            "built_area": 95.0,
            "rooms": 3,
            "bathrooms": 2,
            "parking_spaces": 1,
            "furnished": False,
            "year_built": 2023,
            "price": 78000.00,
            "is_negotiable": False,
            "contact_phone": "+593 96 888 9999"
        },
        {
            "owner": users["carlos_martinez"],
            "title": "Lote Urbano Esquinero",
            "description": "Terreno esquinero en zona de expansión urbana. Ideal para construcción de vivienda o pequeño edificio.",
            "property_type": "land",
            "status": "for_sale",
            "address": "Urbanización Nueva Esperanza",
            "city": "Macas",
            "province": "Morona Santiago",
            "latitude": -2.3234,
            "longitude": -78.1298,
            "area": 300.0,
            "rooms": 0,
            "bathrooms": 0,
            "parking_spaces": 0,
            "price": 35000.00,
            "is_negotiable": True,
            "contact_phone": "+593 96 888 9999",
            "polygon": {
                "type": "Polygon",
                "coordinates": [[
                    [-78.1298, -2.3234],
                    [-78.1294, -2.3234],
                    [-78.1294, -2.3237],
                    [-78.1298, -2.3237],
                    [-78.1298, -2.3234]
                ]]
            }
        }
    ]

    properties = []
    for prop_data in properties_data:
        prop = Property.objects.create(**prop_data)
        properties.append(prop)
        print(f"  ✓ Propiedad creada: {prop.title} (Propietario: {prop.owner.get_full_name()})")

    return properties

def main():
    print("=" * 60)
    print("  POBLANDO BASE DE DATOS CON DATOS DE PRUEBA")
    print("=" * 60)

    clear_database()
    users = create_test_users()
    properties = create_test_properties(users)

    print("\n" + "=" * 60)
    print(f"✅ Proceso completado exitosamente!")
    print(f"   - Usuarios creados: {len(users)}")
    print(f"   - Propiedades creadas: {len(properties)}")
    print("=" * 60)

if __name__ == "__main__":
    main()
