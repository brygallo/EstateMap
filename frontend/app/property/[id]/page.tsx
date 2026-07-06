import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Ruler, BedDouble, Bath, Car, MapPin, ArrowRight } from 'lucide-react';
import { jsonLd, slugify, SITE_URL } from '@/lib/properties';

/** Ficha de dato de la propiedad: icono lucide + valor en mono + etiqueta. */
function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Ruler;
  value: number | string;
  label: string;
}) {
  return (
    <div className="stat-tile !py-4 gap-1.5">
      <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} aria-hidden />
      <div className="stat-value !text-2xl">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

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

function formatPrice(price: string): string {
  const value = Number.parseFloat(price);
  if (!Number.isFinite(value)) {
    return 'Precio a consultar';
  }
  return `$${value.toLocaleString('es-EC')}`;
}

function formatArea(area: string | null): string {
  const value = Number.parseFloat(area || '');
  if (!Number.isFinite(value)) {
    return '';
  }
  return `${Math.round(value)} m²`;
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
  const location = [property.city, property.province].filter(Boolean).join(', ');
  const titleSuffix = location ? ` | ${location}` : '';
  const title = `${propertyTypeLabel} ${statusLabel} - ${property.title}${titleSuffix}`;

  // Build detailed description
  const priceFormatted = formatPrice(property.price);
  const areaFormatted = formatArea(property.area);
  const summaryParts = [
    `${propertyTypeLabel} ${statusLabel.toLowerCase()}`,
    priceFormatted,
    areaFormatted ? `Área ${areaFormatted}` : null,
    property.rooms > 0 ? `${property.rooms} habitaciones` : null,
    property.bathrooms > 0 ? `${property.bathrooms} baños` : null,
    location ? `En ${location}` : null,
  ].filter(Boolean);

  let description = summaryParts.join(' | ');

  if (property.description) {
    const cleanExcerpt = property.description.replace(/\s+/g, ' ').trim();
    description += ` | ${cleanExcerpt.substring(0, 140)}${cleanExcerpt.length > 140 ? '...' : ''}`;
  }

  // Get main image
  const mainImage = property.images?.find((img: any) => img.is_main) || property.images?.[0];
  const imageUrl = mainImage?.image || '/og-image.png';

  // Base URL for images and page
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://geopropiedadesecuador.com';
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
      type: 'article',
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
    alternates: {
      canonical: propertyUrl,
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

// Fully indexable property page. Users can open the interactive map via the
// call-to-action, but the page no longer auto-redirects: that made it a
// redirect in Google's eyes and served different content to bots vs. users
// (cloaking), which hurts indexing.
export default async function PropertyPage({ params }: PropertyPageProps) {
  const resolvedParams = await params;
  const property = await getProperty(resolvedParams.id);

  if (!property) {
    notFound();
  }

  const mapUrl = `/?property=${resolvedParams.id}`;
  const propertyTypeLabel = getPropertyTypeLabel(property.property_type);
  const statusLabel = getStatusLabel(property.status);
  const priceFormatted = formatPrice(property.price);
  const mainImage = property.images?.find((img: any) => img.is_main) || property.images?.[0];
  const areaFormatted = formatArea(property.area);
  const location = [property.city, property.province].filter(Boolean).join(', ');
  const summaryParts = [
    `${propertyTypeLabel} ${statusLabel.toLowerCase()}`,
    priceFormatted,
    areaFormatted ? `Área ${areaFormatted}` : null,
    property.rooms > 0 ? `${property.rooms} habitaciones` : null,
    property.bathrooms > 0 ? `${property.bathrooms} baños` : null,
    location ? `En ${location}` : null,
  ].filter(Boolean);

  // Get absolute URL for images
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://geopropiedadesecuador.com';
  const imageUrl = mainImage?.image || '/og-image.png';
  const imageAbsoluteUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;
  const propertyUrl = `${baseUrl}/property/${property.id}`;
  const propertySchemaType: Record<string, string> = {
    house: 'SingleFamilyResidence',
    apartment: 'Apartment',
    land: 'LandParcel',
    commercial: 'CommercialProperty',
    other: 'Residence',
  };
  const listingStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title || `${propertyTypeLabel} ${statusLabel}`,
    description: property.description || `${propertyTypeLabel} ${statusLabel.toLowerCase()} en Ecuador`,
    url: propertyUrl,
    image:
      property.images?.length > 0
        ? property.images
            .slice(0, 5)
            .map((img: any) => (img.image.startsWith('http') ? img.image : `${baseUrl}${img.image}`))
        : [imageAbsoluteUrl],
    datePosted: property.created_at,
    offers: {
      '@type': 'Offer',
      price: property.price?.toString(),
      priceCurrency: 'USD',
      availability:
        property.status === 'inactive'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
      url: propertyUrl,
    },
    itemOffered: {
      '@type': propertySchemaType[property.property_type] || 'Residence',
      name: property.title || `${propertyTypeLabel} ${statusLabel}`,
      description: property.description || undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: property.address || undefined,
        addressLocality: property.city || undefined,
        addressRegion: property.province || undefined,
        addressCountry: 'EC',
      },
      geo:
        property.latitude && property.longitude
          ? {
              '@type': 'GeoCoordinates',
              latitude: property.latitude,
              longitude: property.longitude,
            }
          : undefined,
      floorSize: property.area
        ? {
            '@type': 'QuantitativeValue',
            value: property.area,
            unitText: 'MTR',
          }
        : undefined,
      numberOfRooms: property.rooms || undefined,
      numberOfBathroomsTotal: property.bathrooms || undefined,
    },
  };

  const citySlug = property.city ? slugify(property.city) : '';
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      ...(citySlug
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: `Propiedades en ${property.city}`,
              item: `${SITE_URL}/propiedades/${citySlug}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: citySlug ? 3 : 2,
        name: property.title || `${propertyTypeLabel} ${statusLabel}`,
        item: propertyUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(listingStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbData) }}
      />

      {/* Full property content — indexable and shareable */}
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto bg-surface rounded-2xl shadow-cardHover border border-line overflow-hidden">
          {/* Property Image */}
          {mainImage && (
            <div className="relative h-96 bg-background">
              <img
                src={imageAbsoluteUrl}
                alt={property.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4">
                <span className="bg-primary text-white px-4 py-2 rounded-full font-semibold text-sm shadow-cardHover">
                  {statusLabel}
                </span>
              </div>
            </div>
          )}

          {/* Property Info */}
          <div className="p-8">
            <div className="mb-4">
              <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold mb-2">
                {propertyTypeLabel}
              </span>
              <h1 className="text-4xl font-bold text-textPrimary mb-2">
                {property.title}
              </h1>
              <p className="text-textSecondary text-base mb-4">
                {summaryParts.join(' • ')}
              </p>
              <p className="price text-3xl">
                {priceFormatted}
                {property.is_negotiable && (
                  <span className="font-sans text-base font-medium text-secondary ml-2">
                    (Negociable)
                  </span>
                )}
              </p>
            </div>

            {/* Location */}
            {(property.city || property.address) && (
              <div className="flex items-center gap-2 text-textSecondary mb-6">
                <MapPin className="h-5 w-5 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
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
                <StatTile icon={Ruler} value={Math.round(parseFloat(property.area))} label="m² Total" />
              )}
              {property.rooms > 0 && (
                <StatTile icon={BedDouble} value={property.rooms} label="Habitaciones" />
              )}
              {property.bathrooms > 0 && (
                <StatTile icon={Bath} value={property.bathrooms} label="Baños" />
              )}
              {property.parking_spaces > 0 && (
                <StatTile icon={Car} value={property.parking_spaces} label="Parqueaderos" />
              )}
            </div>

            {/* Description */}
            {property.description && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-textPrimary mb-3">
                  Descripción
                </h2>
                <p className="text-textSecondary leading-relaxed">
                  {property.description}
                </p>
              </div>
            )}

            {/* Call to action */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={mapUrl}
                className="btn btn-lg btn-primary flex-1"
              >
                Ver en el mapa interactivo
                <ArrowRight className="h-5 w-5" strokeWidth={2} aria-hidden />
              </Link>
              <Link
                href="/"
                className="btn btn-lg btn-secondary flex-1"
              >
                Ver más propiedades
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
