"""
Script para poblar la base de datos con 200 propiedades y usuarios de prueba
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
        {"username": "admin", "email": "admin@estatemap.com", "password": "admin123", "first_name": "Admin", "last_name": "EstateMap", "is_staff": True, "is_superuser": True},
    ]

    # Generar 20 usuarios adicionales
    nombres = ["Juan", "María", "Pedro", "Ana", "Carlos", "Laura", "José", "Carmen", "Luis", "Rosa",
               "Miguel", "Elena", "Francisco", "Isabel", "Antonio", "Patricia", "Manuel", "Lucía", "David", "Sofía"]
    apellidos = ["García", "Rodríguez", "Martínez", "López", "González", "Pérez", "Sánchez", "Ramírez",
                 "Torres", "Flores", "Rivera", "Morales", "Jiménez", "Hernández", "Ruiz", "Díaz", "Cruz", "Ortiz"]

    for i in range(20):
        nombre = random.choice(nombres)
        apellido = random.choice(apellidos)
        users_data.append({
            "username": f"usuario{i+1}",
            "email": f"usuario{i+1}@email.com",
            "password": f"pass{i+1}",
            "first_name": nombre,
            "last_name": apellido
        })

    users = {}
    for user_data in users_data:
        password = user_data.pop('password')
        user = User.objects.create_user(**user_data)
        user.set_password(password)
        user.save()
        users[user.username] = user
        print(f"  ✓ Usuario creado: {user.username}")

    return users

def generate_polygon(center_lat, center_lng, size=0.0005):
    """Genera un polígono rectangular alrededor de un punto central"""
    return {
        "type": "Polygon",
        "coordinates": [[
            [center_lng - size, center_lat - size],
            [center_lng + size, center_lat - size],
            [center_lng + size, center_lat + size],
            [center_lng - size, center_lat + size],
            [center_lng - size, center_lat - size]
        ]]
    }

def create_test_properties(users):
    """Crea 200 propiedades de prueba"""
    print("\n🏡 Creando 200 propiedades de prueba...")

    property_types = ['house', 'apartment', 'land', 'commercial']
    statuses = ['for_sale', 'for_rent', 'inactive']

    titles_casa = [
        "Casa Moderna", "Casa Acogedora", "Casa Familiar", "Casa con Jardín", "Casa Espaciosa",
        "Hermosa Casa", "Casa de Lujo", "Casa Tradicional", "Casa Colonial", "Casa Campestre"
    ]

    titles_apto = [
        "Apartamento Moderno", "Departamento Céntrico", "Apartamento Nuevo", "Acogedor Apartamento",
        "Apartamento Amoblado", "Loft Moderno", "Penthouse", "Apartamento Familiar"
    ]

    titles_terreno = [
        "Terreno Plano", "Lote Urbano", "Terreno Comercial", "Terreno Agrícola", "Lote Esquinero",
        "Terreno con Agua", "Lote Residencial", "Terreno Industrial", "Finca", "Quinta"
    ]

    titles_comercial = [
        "Local Comercial", "Oficina Moderna", "Bodega Amplia", "Edificio Comercial", "Centro Comercial",
        "Local en Renta", "Espacio Comercial", "Nave Industrial"
    ]

    descriptions = [
        "Excelente ubicación en zona residencial tranquila. Perfecta para familias que buscan comodidad y seguridad.",
        "Propiedad en perfectas condiciones lista para habitar. No requiere ninguna reparación.",
        "Ubicado en zona céntrica con todos los servicios cercanos. Fácil acceso a transporte público.",
        "Ideal para inversión o uso propio. Gran potencial de revalorización en la zona.",
        "Amplio y luminoso con excelente distribución de espacios. Ventanas grandes con mucha luz natural.",
        "Acabados de primera calidad en todas las áreas. Materiales premium y diseño moderno.",
        "Zona en crecimiento con alta plusvalía. Inversión segura a largo plazo.",
        "Cerca de centros educativos y comerciales. A pocos minutos de escuelas y supermercados.",
        "Excelente oportunidad de compra. Precio por debajo del mercado.",
        "Con todos los servicios básicos incluidos. Agua, luz, internet de fibra óptica."
    ]

    # Zonas de Macas con sus coordenadas aproximadas
    zonas = [
        {"nombre": "Centro", "lat": -2.3089, "lng": -78.1156},
        {"nombre": "Norte", "lat": -2.2956, "lng": -78.1134},
        {"nombre": "Sur", "lat": -2.3234, "lng": -78.1178},
        {"nombre": "Este", "lat": -2.3067, "lng": -78.1045},
        {"nombre": "Oeste", "lat": -2.3112, "lng": -78.1289},
        {"nombre": "Sector Don Bosco", "lat": -2.2987, "lng": -78.1234},
        {"nombre": "Sector 29 de Mayo", "lat": -2.3145, "lng": -78.1167},
        {"nombre": "Sector Los Pinos", "lat": -2.3123, "lng": -78.1089},
        {"nombre": "Vía Puyo", "lat": -2.2756, "lng": -78.0987},
        {"nombre": "Vía Sucúa", "lat": -2.3456, "lng": -78.0876},
    ]

    user_list = [u for u in users.values() if not u.is_superuser]
    properties_created = 0

    for i in range(200):
        # Seleccionar usuario aleatorio
        owner = random.choice(user_list)

        # Seleccionar zona aleatoria
        zona = random.choice(zonas)

        # Agregar variación aleatoria a las coordenadas
        lat = zona["lat"] + random.uniform(-0.01, 0.01)
        lng = zona["lng"] + random.uniform(-0.01, 0.01)

        # Seleccionar tipo de propiedad
        prop_type = random.choice(property_types)

        # Generar título según el tipo
        if prop_type == 'house':
            title = f"{random.choice(titles_casa)} en {zona['nombre']}"
        elif prop_type == 'apartment':
            title = f"{random.choice(titles_apto)} en {zona['nombre']}"
        elif prop_type == 'land':
            title = f"{random.choice(titles_terreno)} en {zona['nombre']}"
        else:
            title = f"{random.choice(titles_comercial)} en {zona['nombre']}"

        # Generar datos según el tipo
        status = random.choice(statuses)

        # Áreas
        if prop_type == 'land':
            area = round(random.uniform(200, 5000), 2)
            built_area = None
            rooms = 0
            bathrooms = 0
            parking_spaces = 0
            floors = None
            furnished = False
        elif prop_type == 'apartment':
            area = round(random.uniform(45, 150), 2)
            built_area = area
            rooms = random.randint(1, 4)
            bathrooms = random.randint(1, 3)
            parking_spaces = random.randint(0, 2)
            floors = None
            furnished = random.choice([True, False])
        elif prop_type == 'house':
            area = round(random.uniform(100, 800), 2)
            built_area = round(area * random.uniform(0.4, 0.8), 2)
            rooms = random.randint(2, 6)
            bathrooms = random.randint(1, 4)
            parking_spaces = random.randint(1, 4)
            floors = random.randint(1, 3)
            furnished = random.choice([True, False, False])
        else:  # commercial
            area = round(random.uniform(50, 500), 2)
            built_area = area
            rooms = 0
            bathrooms = random.randint(1, 3)
            parking_spaces = random.randint(0, 5)
            floors = random.randint(1, 2)
            furnished = False

        # Precio
        if status == 'for_sale':
            if prop_type == 'land':
                price = round(area * random.uniform(30, 100), 2)
            elif prop_type == 'apartment':
                price = round(area * random.uniform(800, 1500), 2)
            elif prop_type == 'house':
                price = round(area * random.uniform(400, 1200), 2)
            else:
                price = round(area * random.uniform(1000, 2000), 2)
        else:  # for_rent
            if prop_type == 'apartment':
                price = round(area * random.uniform(2, 5), 2)
            elif prop_type == 'house':
                price = round(area * random.uniform(3, 8), 2)
            else:
                price = round(area * random.uniform(5, 15), 2)

        property_data = {
            "owner": owner,
            "title": title,
            "description": random.choice(descriptions),
            "property_type": prop_type,
            "status": status,
            "address": f"Calle {random.randint(1, 50)} y Av. {random.randint(1, 30)}",
            "city": "Macas",
            "province": "Morona Santiago",
            "latitude": lat,
            "longitude": lng,
            "area": area,
            "built_area": built_area,
            "rooms": rooms,
            "bathrooms": bathrooms,
            "parking_spaces": parking_spaces,
            "floors": floors,
            "furnished": furnished,
            "year_built": random.randint(2000, 2024) if prop_type != 'land' else None,
            "price": price,
            "is_negotiable": random.choice([True, False]),
            "contact_phone": f"+593 9{random.randint(6, 9)} {random.randint(100, 999)} {random.randint(1000, 9999)}",
            "polygon": generate_polygon(lat, lng, random.uniform(0.0003, 0.001))
        }

        try:
            prop = Property.objects.create(**property_data)
            properties_created += 1

            if (properties_created) % 20 == 0:
                print(f"  ✓ {properties_created} propiedades creadas...")
        except Exception as e:
            print(f"  ✗ Error creando propiedad {i+1}: {str(e)}")

    return properties_created

def main():
    print("=" * 70)
    print("  POBLANDO BASE DE DATOS CON 200 PROPIEDADES DE PRUEBA")
    print("=" * 70)

    clear_database()
    users = create_test_users()
    properties_count = create_test_properties(users)

    print("\n" + "=" * 70)
    print(f"✅ Proceso completado exitosamente!")
    print(f"   - Usuarios creados: {len(users)}")
    print(f"   - Propiedades creadas: {properties_count}")
    print("=" * 70)

if __name__ == "__main__":
    main()
