import { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface PropertyPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Fetch property data from API
async function getProperty(id: string) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const res = await fetch(`${API_URL}/properties/${id}/`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Error fetching property:', error);
    return null;
  }
}

// Helper function to get property type label in Spanish (for user display)
function getPropertyTypeLabel(type: string): string {
  const labels: { [key: string]: string } = {
    house: 'Casa',
    land: 'Terreno',
    apartment: 'Apartamento',
    commercial: 'Propiedad Comercial',
    other: 'Propiedad',
  };
  return labels[type] || 'Propiedad';
}

// Helper function to get status label in Spanish (for user display)
function getStatusLabel(status: string): string {
  const labels: { [key: string]: string } = {
    for_sale: 'En Venta',
    for_rent: 'En Alquiler',
    inactive: 'Inactivo',
  };
  return labels[status] || status;
}

// Generate dynamic metadata with Open Graph tags for social sharing
export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const property = await getProperty(resolvedParams.id);

  if (!property) {
    return {
      title: 'Propiedad no encontrada',
      description: 'La propiedad que buscas no está disponible.',
    };
  }

  // Build professional title
  const propertyTypeLabel = getPropertyTypeLabel(property.property_type);
  const statusLabel = getStatusLabel(property.status);
  const title = `${propertyTypeLabel} ${statusLabel} - ${property.title}`;

  // Build detailed description
  const priceFormatted = `$${parseFloat(property.price).toLocaleString('es-EC')}`;
  const areaFormatted = property.area ? `${Math.round(parseFloat(property.area))} m²` : '';
  const location = [property.city, property.province].filter(Boolean).join(', ');

  let description = `${propertyTypeLabel} ${statusLabel.toLowerCase()} por ${priceFormatted}`;

  if (areaFormatted) {
    description += ` • ${areaFormatted}`;
  }

  if (property.rooms > 0) {
    description += ` • ${property.rooms} habitaciones`;
  }

  if (property.bathrooms > 0) {
    description += ` • ${property.bathrooms} baños`;
  }

  if (location) {
    description += ` • Ubicada en ${location}`;
  }

  if (property.description) {
    description += ` • ${property.description.substring(0, 100)}${property.description.length > 100 ? '...' : ''}`;
  }

  // Get main image
  const mainImage = property.images?.find((img: any) => img.is_main) || property.images?.[0];
  const imageUrl = mainImage?.image || '/icon-512x512.png';

  // Base URL for images and page
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://estatemap.com';
  const propertyUrl = `${baseUrl}/property/${property.id}`;
  const imageAbsoluteUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;

  return {
    title,
    description,
    keywords: [
      'propiedad',
      'inmobiliaria',
      'Ecuador',
      propertyTypeLabel.toLowerCase(),
      statusLabel.toLowerCase(),
      property.city,
      property.province,
      'bienes raíces',
      ...(property.property_type === 'house' ? ['casa', 'vivienda'] : []),
      ...(property.property_type === 'land' ? ['terreno', 'lote'] : []),
      ...(property.property_type === 'apartment' ? ['departamento', 'apartamento'] : []),
      ...(property.property_type === 'commercial' ? ['local comercial', 'negocio'] : []),
    ].filter(Boolean),
    authors: [{ name: 'Geo Propiedades Ecuador' }],
    openGraph: {
      title,
      description,
      url: propertyUrl,
      siteName: 'Geo Propiedades Ecuador',
      locale: 'es_EC',
      type: 'website',
      images: [
        {
          url: imageAbsoluteUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
        // Include all property images (up to 5)
        ...(property.images
          ?.slice(0, 5)
          .map((img: any) => ({
            url: img.image.startsWith('http') ? img.image : `${baseUrl}${img.image}`,
            alt: `${title} - Imagen adicional`,
          })) || []),
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageAbsoluteUrl],
    },
    // Additional meta tags for Facebook and social platforms
    other: {
      'fb:app_id': process.env.NEXT_PUBLIC_FB_APP_ID || '',
      'og:type': 'article',
      'og:price:amount': property.price.toString(),
      'og:price:currency': 'USD',
      'article:published_time': property.created_at || new Date().toISOString(),
      'article:author': property.owner_username || 'Geo Propiedades Ecuador',
      'product:price:amount': property.price.toString(),
      'product:price:currency': 'USD',
    },
  };
}

// Page component that shows property info for bots and redirects users to main map
export default async function PropertyPage({ params }: PropertyPageProps) {
  const resolvedParams = await params;
  const property = await getProperty(resolvedParams.id);

  if (!property) {
    redirect('/');
  }

  const redirectUrl = `/?property=${resolvedParams.id}`;
  const propertyTypeLabel = getPropertyTypeLabel(property.property_type);
  const statusLabel = getStatusLabel(property.status);
  const priceFormatted = `$${parseFloat(property.price).toLocaleString('es-EC')}`;
  const mainImage = property.images?.find((img: any) => img.is_main) || property.images?.[0];

  // Get absolute URL for images
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://estatemap.com';
  const imageUrl = mainImage?.image || '/icon-512x512.png';
  const imageAbsoluteUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;

  return (
    <>
      {/* Meta refresh for non-JS browsers and as fallback */}
      <meta httpEquiv="refresh" content={`0;url=${redirectUrl}`} />

      {/* Client-side redirect for users (bots won't execute this) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Redirect users to main page with modal open
            if (typeof window !== 'undefined') {
              window.location.replace('${redirectUrl}');
            }
          `,
        }}
      />

      {/* Content visible to bots (Facebook, Twitter, etc.) */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Property Image */}
          {mainImage && (
            <div className="relative h-96 bg-gray-200">
              <img
                src={imageAbsoluteUrl}
                alt={property.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4">
                <span className="bg-green-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                  {statusLabel}
                </span>
              </div>
            </div>
          )}

          {/* Property Info */}
          <div className="p-8">
            <div className="mb-4">
              <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold mb-2">
                {propertyTypeLabel}
              </span>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {property.title}
              </h1>
              <p className="text-3xl font-bold text-green-600">
                {priceFormatted}
                {property.is_negotiable && (
                  <span className="text-base text-blue-600 ml-2">
                    (Negociable)
                  </span>
                )}
              </p>
            </div>

            {/* Location */}
            {(property.city || property.address) && (
              <div className="flex items-center gap-2 text-gray-600 mb-6">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-lg">
                  {property.address && <>{property.address}</>}
                  {property.address && property.city && <>, </>}
                  {property.city && <>{property.city}</>}
                  {property.province && <>, {property.province}</>}
                </span>
              </div>
            )}

            {/* Features Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {property.area && (
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-1">📐</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round(parseFloat(property.area))}
                  </div>
                  <div className="text-sm text-gray-600">m² Total</div>
                </div>
              )}
              {property.rooms > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-1">🛏️</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {property.rooms}
                  </div>
                  <div className="text-sm text-gray-600">Habitaciones</div>
                </div>
              )}
              {property.bathrooms > 0 && (
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-1">🚿</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {property.bathrooms}
                  </div>
                  <div className="text-sm text-gray-600">Baños</div>
                </div>
              )}
              {property.parking_spaces > 0 && (
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-1">🚗</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {property.parking_spaces}
                  </div>
                  <div className="text-sm text-gray-600">Parqueaderos</div>
                </div>
              )}
            </div>

            {/* Description */}
            {property.description && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Descripción
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {property.description}
                </p>
              </div>
            )}

            {/* Contact Button */}
            <div className="mt-8">
              <a
                href={redirectUrl}
                className="inline-block w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center px-8 py-4 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
              >
                Ver en el Mapa Interactivo
              </a>
            </div>

            {/* Redirect message */}
            <div className="mt-4 text-center text-gray-500 text-sm">
              Redirigiendo automáticamente...
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
