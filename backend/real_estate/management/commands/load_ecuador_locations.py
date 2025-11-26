"""
Comando para cargar las provincias y ciudades de Ecuador en la base de datos
Uso: python manage.py load_ecuador_locations
"""
from django.core.management.base import BaseCommand
from real_estate.models import Province, City


class Command(BaseCommand):
    help = 'Carga las provincias y ciudades de Ecuador en la base de datos'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Cargando provincias y ciudades de Ecuador...'))

        # Datos de provincias y sus ciudades (cantones)
        ecuador_data = {
            'Azuay': ['Cuenca', 'Girón', 'Gualaceo', 'Nabón', 'Paute', 'Pucará', 'San Fernando',
                     'Santa Isabel', 'Sigsig', 'Oña', 'Chordeleg', 'El Pan', 'Sevilla de Oro',
                     'Guachapala', 'Camilo Ponce Enríquez'],

            'Bolívar': ['Guaranda', 'Chillanes', 'Chimbo', 'Echeandía', 'San Miguel',
                       'Caluma', 'Las Naves'],

            'Cañar': ['Azogues', 'Biblián', 'Cañar', 'La Troncal', 'El Tambo', 'Déleg', 'Suscal'],

            'Carchi': ['Tulcán', 'Bolívar', 'Espejo', 'Mira', 'Montúfar', 'San Pedro de Huaca'],

            'Chimborazo': ['Riobamba', 'Alausí', 'Colta', 'Chambo', 'Chunchi', 'Guamote',
                          'Guano', 'Pallatanga', 'Penipe', 'Cumandá'],

            'Cotopaxi': ['Latacunga', 'La Maná', 'Pangua', 'Pujilí', 'Salcedo', 'Saquisilí', 'Sigchos'],

            'El Oro': ['Machala', 'Arenillas', 'Atahualpa', 'Balsas', 'Chilla', 'El Guabo',
                      'Huaquillas', 'Marcabelí', 'Pasaje', 'Piñas', 'Portovelo', 'Santa Rosa',
                      'Zaruma', 'Las Lajas'],

            'Esmeraldas': ['Esmeraldas', 'Eloy Alfaro', 'Muisne', 'Quinindé', 'San Lorenzo',
                          'Atacames', 'Rioverde', 'La Concordia'],

            'Galápagos': ['San Cristóbal', 'Isabela', 'Santa Cruz'],

            'Guayas': ['Guayaquil', 'Alfredo Baquerizo Moreno', 'Balao', 'Balzar', 'Colimes',
                      'Daule', 'Durán', 'El Empalme', 'El Triunfo', 'Milagro', 'Naranjal',
                      'Naranjito', 'Palestina', 'Pedro Carbo', 'Samborondón', 'Santa Lucía',
                      'Salitre', 'San Jacinto de Yaguachi', 'Playas', 'Simón Bolívar',
                      'Coronel Marcelino Maridueña', 'Lomas de Sargentillo', 'Nobol',
                      'General Antonio Elizalde', 'Isidro Ayora'],

            'Imbabura': ['Ibarra', 'Antonio Ante', 'Cotacachi', 'Otavalo', 'Pimampiro', 'San Miguel de Urcuquí'],

            'Loja': ['Loja', 'Calvas', 'Catamayo', 'Celica', 'Chaguarpamba', 'Espíndola',
                    'Gonzanamá', 'Macará', 'Paltas', 'Puyango', 'Saraguro', 'Sozoranga',
                    'Zapotillo', 'Pindal', 'Quilanga', 'Olmedo'],

            'Los Ríos': ['Babahoyo', 'Baba', 'Montalvo', 'Puebloviejo', 'Quevedo', 'Urdaneta',
                        'Ventanas', 'Vínces', 'Palenque', 'Buena Fe', 'Valencia', 'Mocache', 'Quinsaloma'],

            'Manabí': ['Portoviejo', 'Bolívar', 'Chone', 'El Carmen', 'Flavio Alfaro', 'Jipijapa',
                      'Junín', 'Manta', 'Montecristi', 'Paján', 'Pichincha', 'Rocafuerte',
                      'Santa Ana', 'Sucre', 'Tosagua', 'Twentyfour de Mayo', 'Pedernales',
                      'Olmedo', 'Puerto López', 'Jama', 'Jaramijó', 'San Vicente'],

            'Morona Santiago': ['Macas', 'Gualaquiza', 'Limón Indanza', 'Palora', 'Santiago',
                               'Sucúa', 'Huamboya', 'San Juan Bosco', 'Taisha', 'Logroño',
                               'Pablo Sexto', 'Tiwintza'],

            'Napo': ['Tena', 'Archidona', 'El Chaco', 'Quijos', 'Carlos Julio Arosemena Tola'],

            'Orellana': ['Francisco de Orellana', 'Aguarico', 'La Joya de los Sachas', 'Loreto'],

            'Pastaza': ['Puyo', 'Arajuno', 'Mera', 'Santa Clara'],

            'Pichincha': ['Quito', 'Cayambe', 'Mejía', 'Pedro Moncayo', 'Rumiñahui',
                         'San Miguel de los Bancos', 'Pedro Vicente Maldonado', 'Puerto Quito'],

            'Santa Elena': ['Santa Elena', 'La Libertad', 'Salinas'],

            'Santo Domingo de los Tsáchilas': ['Santo Domingo'],

            'Sucumbíos': ['Nueva Loja', 'Gonzalo Pizarro', 'Putumayo', 'Shushufindi',
                         'Sucumbíos', 'Cascales', 'Cuyabeno'],

            'Tungurahua': ['Ambato', 'Baños de Agua Santa', 'Cevallos', 'Mocha', 'Patate',
                          'Quero', 'Tisaleo', 'Píllaro', 'Pelileo'],

            'Zamora Chinchipe': ['Zamora', 'Chinchipe', 'Nangaritza', 'Yacuambi', 'Yantzaza',
                                'El Pangui', 'Centinela del Cóndor', 'Palanda', 'Paquisha'],
        }

        created_provinces = 0
        created_cities = 0
        skipped_provinces = 0
        skipped_cities = 0

        for province_name, cities in ecuador_data.items():
            # Crear o obtener provincia
            province, created = Province.objects.get_or_create(
                name=province_name,
                defaults={'country': 'Ecuador'}
            )

            if created:
                created_provinces += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ Provincia creada: {province_name}'))
            else:
                skipped_provinces += 1
                self.stdout.write(f'  - Provincia ya existe: {province_name}')

            # Crear ciudades para esta provincia
            for city_name in cities:
                city, created = City.objects.get_or_create(
                    name=city_name,
                    province=province
                )

                if created:
                    created_cities += 1
                else:
                    skipped_cities += 1

        self.stdout.write(self.style.SUCCESS('\n' + '='*50))
        self.stdout.write(self.style.SUCCESS('Resumen:'))
        self.stdout.write(self.style.SUCCESS(f'  Provincias creadas: {created_provinces}'))
        self.stdout.write(self.style.SUCCESS(f'  Provincias existentes: {skipped_provinces}'))
        self.stdout.write(self.style.SUCCESS(f'  Ciudades creadas: {created_cities}'))
        self.stdout.write(self.style.SUCCESS(f'  Ciudades existentes: {skipped_cities}'))
        self.stdout.write(self.style.SUCCESS('='*50))
        self.stdout.write(self.style.SUCCESS('\n¡Datos cargados exitosamente!'))
