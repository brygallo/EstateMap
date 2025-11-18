"""
Script para poblar la base de datos con 20 usuarios y 300 propiedades
"""
import os
import django
import sys
import random

# Configurar Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estate_map.settings')
django.setup()

from django.contrib.auth import get_user_model
from real_estate.models import Property

User = get_user_model()


def create_users():
    """Crea 20 usuarios de prueba"""
    print("\n👥 Creando 20 usuarios de prueba...")

    # Nombres y apellidos ecuatorianos comunes
    first_names = [
        "Juan", "María", "Carlos", "Ana", "Luis", "Carmen", "José", "Rosa",
        "Pedro", "Laura", "Miguel", "Isabel", "Jorge", "Patricia", "Diego",
        "Sofía", "Andrés", "Gabriela", "Fernando", "Daniela"
    ]

    last_names = [
        "García", "López", "Rodríguez", "Martínez", "González", "Pérez", "Sánchez", "Ramírez",
        "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Cruz", "Morales", "Jiménez",
        "Herrera", "Medina", "Castro", "Ortiz"
    ]

    users = []
    for i in range(20):
        first_name = first_names[i]
        last_name = last_names[i]
        username = f"user{i+1}_{first_name.lower()}"
        email = f"{first_name.lower()}.{last_name.lower()}{i+1}@email.com"

        user = User.objects.create_user(
            username=username,
            email=email,
            password="test123",
            first_name=first_name,
            last_name=last_name
        )
        users.append(user)
        print(f"  ✓ Usuario {i+1}/20: {user.username} ({user.email})")

    return users


def generate_address(index):
    """Genera direcciones variadas en Macas"""
    streets = [
        "Av. 29 de Mayo", "Av. Don Bosco", "Calle Bolívar", "Av. Amazonas",
        "Calle 24 de Mayo", "Calle Sucre", "Av. Sangay", "Calle Cuenca",
        "Av. 10 de Agosto", "Calle Tarqui", "Av. Soasti", "Calle Soasti",
        "Barrio Los Pinos", "Barrio Central", "Urbanización Nueva Esperanza",
        "Sector San José", "Vía Macas-Puyo", "Sector La Florida"
    ]
    return f"{random.choice(streets)} N° {random.randint(100, 999)}"


def generate_coordinates(base_lat, base_lon, spread=0.05):
    """Genera coordenadas aleatorias alrededor de Macas"""
    return (
        base_lat + random.uniform(-spread, spread),
        base_lon + random.uniform(-spread, spread)
    )


def generate_polygon(lat, lon):
    """Genera un polígono simple alrededor de unas coordenadas"""
    size = random.uniform(0.001, 0.005)
    return {
        "type": "Polygon",
        "coordinates": [[
            [lon, lat],
            [lon + size, lat],
            [lon + size, lat + size],
            [lon, lat + size],
            [lon, lat]
        ]]
    }


def create_properties(users):
    """Crea 300 propiedades de prueba asignadas a los usuarios"""
    print("\n🏡 Creando 300 propiedades de prueba...")

    property_types = ["house", "land", "apartment", "commercial", "other"]
    statuses = ["for_sale", "for_rent", "inactive"]

    # Coordenadas base de Macas, Ecuador
    base_lat = -2.3089
    base_lon = -78.1156

    cities = ["Macas", "Sucúa", "Morona", "Gualaquiza", "Limón Indanza"]

    property_titles = {
        "house": [
            "Casa Moderna", "Casa Acogedora", "Casa Familiar", "Casa de Lujo",
            "Casa Campestre", "Villa Espaciosa", "Casa con Jardín", "Residencia Exclusiva"
        ],
        "land": [
            "Terreno Comercial", "Terreno Agrícola", "Lote Urbano", "Terreno con Río",
            "Finca Rústica", "Terreno Esquinero", "Lote Industrial", "Parcela Rural"
        ],
        "apartment": [
            "Departamento Moderno", "Apartamento Acogedor", "Suite Amoblada",
            "Departamento Nuevo", "Apartamento Céntrico", "Loft Espacioso"
        ],
        "commercial": [
            "Local Comercial", "Oficina Ejecutiva", "Edificio Comercial",
            "Bodega Industrial", "Centro Comercial", "Local Estratégico"
        ],
        "other": [
            "Propiedad Mixta", "Inmueble Especial", "Propiedad Única",
            "Proyecto en Desarrollo"
        ]
    }

    descriptions = [
        "Excelente ubicación cerca de todos los servicios",
        "Ideal para inversión o vivienda familiar",
        "Zona tranquila y segura con fácil acceso",
        "Perfecta oportunidad de negocio",
        "Amplio y luminoso con acabados de calidad",
        "En zona de alto crecimiento comercial",
        "Vista panorámica y entorno natural",
        "Listo para habitar o remodelar según gusto"
    ]

    properties = []

    for i in range(300):
        # Asignar propiedades a usuarios (algunos tendrán más que otros)
        owner = users[i % len(users)] if random.random() > 0.1 else None

        property_type = random.choice(property_types)
        status = random.choice(statuses)
        city = random.choice(cities)

        # Generar coordenadas
        lat, lon = generate_coordinates(base_lat, base_lon)

        # Datos básicos
        title_prefix = random.choice(property_titles[property_type])
        title = f"{title_prefix} en {city}"
        description = random.choice(descriptions)
        address = generate_address(i)

        # Características según tipo
        if property_type == "house":
            area = random.uniform(100, 500)
            built_area = area * random.uniform(0.5, 0.9)
            rooms = random.randint(2, 6)
            bathrooms = random.randint(1, 4)
            parking_spaces = random.randint(1, 4)
            floors = random.randint(1, 3)
            year_built = random.randint(2000, 2024)
            price = random.uniform(50000, 300000)
            furnished = random.choice([True, False])
            polygon_data = None

        elif property_type == "land":
            area = random.uniform(200, 10000)
            built_area = None
            rooms = 0
            bathrooms = 0
            parking_spaces = 0
            floors = None
            year_built = None
            price = random.uniform(20000, 200000)
            furnished = False
            polygon_data = generate_polygon(lat, lon)

        elif property_type == "apartment":
            area = random.uniform(45, 150)
            built_area = area
            rooms = random.randint(1, 4)
            bathrooms = random.randint(1, 3)
            parking_spaces = random.randint(0, 2)
            floors = None
            year_built = random.randint(2005, 2024)
            price = random.uniform(30000, 150000) if status in ["for_sale", "sold"] else random.uniform(200, 1000)
            furnished = random.choice([True, False])
            polygon_data = None

        elif property_type == "commercial":
            area = random.uniform(50, 500)
            built_area = area * random.uniform(0.7, 1.0)
            rooms = random.randint(0, 8)
            bathrooms = random.randint(1, 4)
            parking_spaces = random.randint(0, 10)
            floors = random.randint(1, 5)
            year_built = random.randint(1995, 2024)
            price = random.uniform(50000, 500000) if status in ["for_sale", "sold"] else random.uniform(500, 5000)
            furnished = False
            polygon_data = None

        else:  # other
            area = random.uniform(100, 1000)
            built_area = area * random.uniform(0.3, 0.8) if random.random() > 0.5 else None
            rooms = random.randint(0, 5)
            bathrooms = random.randint(0, 3)
            parking_spaces = random.randint(0, 3)
            floors = random.randint(1, 3) if built_area else None
            year_built = random.randint(1990, 2024) if built_area else None
            price = random.uniform(30000, 250000)
            furnished = False
            polygon_data = None

        # Ajustar precio si es renta
        if status in ["for_rent", "rented"] and price > 10000:
            price = price / 200  # Convertir precio de venta a renta aproximada

        # Crear la propiedad
        prop_data = {
            "owner": owner,
            "title": title,
            "description": description,
            "property_type": property_type,
            "status": status,
            "address": address,
            "city": city,
            "province": "Morona Santiago",
            "latitude": lat,
            "longitude": lon,
            "area": round(area, 2),
            "built_area": round(built_area, 2) if built_area else None,
            "rooms": rooms,
            "bathrooms": bathrooms,
            "parking_spaces": parking_spaces,
            "floors": floors,
            "furnished": furnished,
            "year_built": year_built,
            "price": round(price, 2),
            "is_negotiable": random.choice([True, False]),
            "contact_phone": f"+593 {random.randint(90, 99)} {random.randint(100, 999)} {random.randint(1000, 9999)}",
            "polygon": polygon_data
        }

        prop = Property.objects.create(**prop_data)
        properties.append(prop)

        if (i + 1) % 30 == 0:
            print(f"  ✓ Propiedades creadas: {i+1}/300")

    print(f"  ✓ Propiedades creadas: 300/300")
    return properties


def print_statistics(users, properties):
    """Imprime estadísticas de la población de datos"""
    print("\n" + "=" * 70)
    print("📊 ESTADÍSTICAS DE PROPIEDADES CREADAS")
    print("=" * 70)

    # Estadísticas por tipo
    print("\nPor tipo de propiedad:")
    for prop_type, label in Property.PROPERTY_TYPE_CHOICES:
        count = sum(1 for p in properties if p.property_type == prop_type)
        print(f"  • {label}: {count}")

    # Estadísticas por estado
    print("\nPor estado:")
    for status, label in Property.STATUS_CHOICES:
        count = sum(1 for p in properties if p.status == status)
        print(f"  • {label}: {count}")

    # Estadísticas por usuario
    print("\nPropiedades por usuario:")
    with_owner = sum(1 for p in properties if p.owner is not None)
    without_owner = sum(1 for p in properties if p.owner is None)
    print(f"  • Con propietario: {with_owner}")
    print(f"  • Sin propietario: {without_owner}")

    # Top 5 usuarios con más propiedades
    user_properties = {}
    for prop in properties:
        if prop.owner:
            if prop.owner.id not in user_properties:
                user_properties[prop.owner.id] = {"user": prop.owner, "count": 0}
            user_properties[prop.owner.id]["count"] += 1

    sorted_users = sorted(user_properties.values(), key=lambda x: x["count"], reverse=True)
    print("\nTop 5 usuarios con más propiedades:")
    for i, data in enumerate(sorted_users[:5], 1):
        user = data["user"]
        count = data["count"]
        print(f"  {i}. {user.get_full_name()} ({user.username}): {count} propiedades")


def main():
    print("=" * 70)
    print("  POBLANDO BASE DE DATOS - 20 USUARIOS Y 300 PROPIEDADES")
    print("=" * 70)

    users = create_users()
    properties = create_properties(users)

    print_statistics(users, properties)

    print("\n" + "=" * 70)
    print(f"✅ Proceso completado exitosamente!")
    print(f"   - Usuarios creados: {len(users)}")
    print(f"   - Propiedades creadas: {len(properties)}")
    print("=" * 70)
    print("\n💡 Credenciales de acceso para todos los usuarios:")
    print("   Usuario: user1_juan, user2_maría, user3_carlos, ... user20_daniela")
    print("   Contraseña: test123")
    print("=" * 70)


if __name__ == "__main__":
    main()
