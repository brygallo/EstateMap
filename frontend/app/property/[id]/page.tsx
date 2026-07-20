import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Ruler,
  BedDouble,
  Bath,
  Car,
  MapPin,
  ArrowRight,
  ExternalLink,
  Phone,
  MessageCircle,
  Home,
  ChevronRight,
  BadgeCheck,
  CalendarDays,
} from 'lucide-react';
import {
  jsonLd,
  slugify,
  SITE_URL,
  getProperty,
  getPropertyTypeLabel,
  getStatusLabel,
  formatPrice,
  formatArea,
  PROPERTY_SCHEMA_TYPE,
} from '@/lib/properties';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import PropertyDetailMap from '@/components/maps/PropertyDetailMap';
import AdminRefreshProperty from '@/components/AdminRefreshProperty';

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
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface px-3 py-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cardHover">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primaryLight">
        <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="font-geo text-2xl font-semibold tabular-nums text-textPrimary">{value}</div>
      <div className="text-xs font-medium text-textSecondary">{label}</div>
    </div>
  );
}

/** Clase de badge sólido por estado, para la sobreimpresión sobre la foto. */
function statusOverlayClass(status: string): string {
  const map: Record<string, string> = {
    for_sale: 'bg-primary text-white',
    for_rent: 'bg-success text-white',
    inactive: 'bg-slate-500 text-white',
  };
  return map[status] || 'bg-primary text-white';
}

interface PropertyPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// La ficha se sirve con ISR (revalida cada 5 min) en vez de `no-store`: los
// crawlers y usuarios reciben HTML cacheado con TTFB bajo, clave para
// Core Web Vitals y para que Google gaste su crawl budget en más fichas.
export const revalidate = 300;

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
    (property.rooms ?? 0) > 0 ? `${property.rooms} habitaciones` : null,
    (property.bathrooms ?? 0) > 0 ? `${property.bathrooms} baños` : null,
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
  const baseUrl = (
    process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://geopropiedadesecuador.com'
  ).replace(/\/+$/, '');
  const propertyUrl = `${baseUrl}/propiedad/${property.id}`;
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
    ].filter(Boolean) as string[],
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
  const rooms = property.rooms ?? 0;
  const bathrooms = property.bathrooms ?? 0;
  const parkingSpaces = property.parking_spaces ?? 0;
  const location = [property.city, property.province].filter(Boolean).join(', ');
  const summaryParts = [
    `${propertyTypeLabel} ${statusLabel.toLowerCase()}`,
    priceFormatted,
    areaFormatted ? `Área ${areaFormatted}` : null,
    rooms > 0 ? `${rooms} habitaciones` : null,
    bathrooms > 0 ? `${bathrooms} baños` : null,
    location ? `En ${location}` : null,
  ].filter(Boolean);

  // Get absolute URL for images
  const baseUrl = (
    process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://geopropiedadesecuador.com'
  ).replace(/\/+$/, '');
  const imageUrl = mainImage?.image || '/og-image.png';
  const imageAbsoluteUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;
  const propertyUrl = `${baseUrl}/propiedad/${property.id}`;
  const areaValue = Number.parseFloat(String(property.area ?? ''));
  const listingStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': `${propertyUrl}#listing`,
    mainEntityOfPage: propertyUrl,
    inLanguage: 'es-EC',
    name: property.title || `${propertyTypeLabel} ${statusLabel}`,
    description: property.description || `${propertyTypeLabel} ${statusLabel.toLowerCase()} en Ecuador`,
    url: propertyUrl,
    image:
      (property.images?.length ?? 0) > 0
        ? property.images!
            .slice(0, 5)
            .map((img: any) => (img.image.startsWith('http') ? img.image : `${baseUrl}${img.image}`))
        : [imageAbsoluteUrl],
    datePosted: property.created_at,
    dateModified: property.updated_at || property.created_at,
    publisher: { '@id': `${SITE_URL}/#organization` },
    offers: {
      '@type': 'Offer',
      price: property.price?.toString(),
      priceCurrency: 'USD',
      availability:
        property.status === 'inactive'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
      url: propertyUrl,
      itemOffered: {
        '@type': PROPERTY_SCHEMA_TYPE[property.property_type] || 'Residence',
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
        floorSize: Number.isFinite(areaValue)
          ? {
              '@type': 'QuantitativeValue',
              value: areaValue,
              unitCode: 'MTK',
              unitText: 'm²',
            }
          : undefined,
        numberOfRooms: rooms || undefined,
        numberOfBedrooms: rooms || undefined,
        numberOfBathroomsTotal: bathrooms || undefined,
        amenityFeature:
          parkingSpaces > 0
            ? [
                {
                  '@type': 'LocationFeatureSpecification',
                  name: 'Parqueaderos',
                  value: parkingSpaces,
                },
              ]
            : undefined,
      },
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

  const galleryImages: { image: string }[] =
    (property.images?.length ?? 0) > 0
      ? property.images!.map((img: any) => ({
          image: img.image?.startsWith('http') ? img.image : `${baseUrl}${img.image}`,
        }))
      : mainImage
        ? [{ image: imageAbsoluteUrl }]
        : [];
  const priceValue = Number.parseFloat(String(property.price));
  const priceIsFinite = Number.isFinite(priceValue);
  // Anuncio venta + alquiler a la vez: `price` es la venta y `rent_price` el alquiler.
  const rentPriceValue = Number.parseFloat(String(property.rent_price ?? ''));
  const hasRentPrice = property.rent_price != null && Number.isFinite(rentPriceValue) && rentPriceValue > 0;
  const rentPriceFormatted = hasRentPrice ? formatPrice(String(property.rent_price)) : '';
  const isImported = Boolean(property.is_imported || property.source_url || property.external_id || property.source);
  const contactPhone = typeof property.contact_phone === 'string' ? property.contact_phone.trim() : '';
  const waPhone = contactPhone ? contactPhone.replace(/[^0-9]/g, '') : '';
  const sourceUrl = typeof property.source_url === 'string' ? property.source_url.trim() : '';
  const sourceAgency = typeof property.source_agency === 'string' ? property.source_agency.trim() : '';
  // Mensaje de WhatsApp con referencia al anuncio y la URL de su ficha en nuestro sitio.
  const waMessage = `Hola, vi este anuncio en Geo Propiedades: ${property.title || 'esta propiedad'}\n${propertyUrl}`;
  const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`;
  const publishedDate = property.created_at
    ? new Date(property.created_at).toLocaleDateString('es-EC', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

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
      <div className="min-h-screen bg-background pb-16">
        <div className="mx-auto max-w-6xl px-4 pt-8">
          {/* Breadcrumb */}
          <nav aria-label="Migas de pan" className="mb-6">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-textSecondary">
              <li>
                <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-primary">
                  <Home className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  Inicio
                </Link>
              </li>
              {citySlug && (
                <>
                  <ChevronRight className="h-4 w-4 text-line" aria-hidden />
                  <li>
                    <Link
                      href={`/propiedades/${citySlug}`}
                      className="transition-colors hover:text-primary"
                    >
                      {property.city}
                    </Link>
                  </li>
                </>
              )}
              <ChevronRight className="h-4 w-4 text-line" aria-hidden />
              <li className="max-w-[12rem] truncate font-medium text-textPrimary sm:max-w-xs" aria-current="page">
                {property.title}
              </li>
            </ol>
          </nav>

          {/* Hero: gran carrusel de fotos */}
          {galleryImages.length > 0 ? (
            <Carousel
              opts={{ loop: galleryImages.length > 1 }}
              className="group relative overflow-hidden rounded-hero border border-line bg-slate-900 shadow-cardHover"
            >
              <CarouselContent className="ml-0">
                {galleryImages.map((img, idx) => (
                  <CarouselItem key={idx} className="pl-0">
                    <div className="relative aspect-[16/10] w-full sm:aspect-[16/8] md:aspect-[16/7]">
                      <img
                        src={img.image}
                        alt={`${property.title} — imagen ${idx + 1}`}
                        className="h-full w-full object-cover"
                        loading={idx === 0 ? 'eager' : 'lazy'}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {/* Badges sobre la foto */}
              <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-cardHover ${statusOverlayClass(property.status)}`}
                >
                  {statusLabel}
                </span>
                <span className="inline-flex items-center rounded-full bg-white/90 px-3.5 py-1.5 text-sm font-semibold text-textPrimary shadow-cardHover backdrop-blur">
                  {propertyTypeLabel}
                </span>
              </div>

              {galleryImages.length > 1 && (
                <>
                  <span className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                    {galleryImages.length} fotos
                  </span>
                  <CarouselPrevious className="left-4 h-10 w-10 border-none bg-white/90 text-textPrimary opacity-0 shadow-cardHover transition-opacity hover:bg-white group-hover:opacity-100 focus-visible:opacity-100" />
                  <CarouselNext className="right-4 h-10 w-10 border-none bg-white/90 text-textPrimary opacity-0 shadow-cardHover transition-opacity hover:bg-white group-hover:opacity-100 focus-visible:opacity-100" />
                </>
              )}
            </Carousel>
          ) : (
            <div className="flex aspect-[16/7] w-full items-center justify-center rounded-hero border border-line bg-muted text-textSecondary">
              <div className="flex flex-col items-center gap-2">
                <Home className="h-10 w-10" strokeWidth={1.5} aria-hidden />
                <span className="text-sm font-medium">Sin imágenes disponibles</span>
              </div>
            </div>
          )}

          <section className="mt-4 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-primaryLight text-primary hover:bg-primaryLight">
                    {propertyTypeLabel}
                  </Badge>
                  <Badge className={`rounded-full border-transparent ${statusOverlayClass(property.status)}`}>
                    {statusLabel}
                  </Badge>
                  {property.is_negotiable && (
                    <Badge className="rounded-full border-transparent bg-secondary/10 text-secondary hover:bg-secondary/10">
                      Precio negociable
                    </Badge>
                  )}
                  {isImported && <AdminRefreshProperty propertyId={property.id} />}
                </div>
                <h1 className="mt-3 text-2xl font-bold leading-tight text-textPrimary sm:text-3xl">
                  {property.title}
                </h1>
                {(property.city || property.address) && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-textSecondary">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                    <span>
                      {property.address && <>{property.address}</>}
                      {property.address && property.city && <>, </>}
                      {property.city && <>{property.city}</>}
                      {property.province && <>, {property.province}</>}
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-card border border-line bg-background p-4 lg:min-w-80">
                <div className="text-xs font-medium uppercase tracking-wide text-textSecondary">Precio</div>
                <div className="mt-1">
                  {priceIsFinite ? (
                    <AnimatedNumber value={priceValue} prefix="$" className="price text-3xl" />
                  ) : (
                    <span className="price text-2xl">{priceFormatted}</span>
                  )}
                </div>
                {hasRentPrice && (
                  <div className="mt-1 text-sm font-semibold text-textSecondary">
                    Alquiler {rentPriceFormatted}/mes
                  </div>
                )}
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {contactPhone ? (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wa-cta inline-flex items-center justify-center gap-2 rounded-button bg-secondary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondaryHover"
                    >
                      <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
                      WhatsApp
                    </a>
                  ) : isImported && sourceUrl ? (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-button bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primaryHover"
                    >
                      <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Contactar anunciante
                    </a>
                  ) : null}
                  <Link
                    href={mapUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-button border border-line bg-white px-4 py-2.5 text-sm font-semibold text-textPrimary transition-colors hover:border-primary hover:text-primary"
                  >
                    Ver en mapa
                    <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Cuerpo: contenido + tarjeta de contacto */}
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Columna principal */}
            <div className="lg:col-span-2">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-primaryLight text-primary hover:bg-primaryLight">
                  {propertyTypeLabel}
                </Badge>
                {property.is_negotiable && (
                  <Badge className="rounded-full border-transparent bg-secondary/10 text-secondary hover:bg-secondary/10">
                    Precio negociable
                  </Badge>
                )}
              </div>

              <p className="mt-3 text-sm text-textSecondary">{summaryParts.join(' • ')}</p>

              <Separator className="my-6 bg-line" />

              {/* Características */}
              <h2 className="mb-4 text-lg font-semibold text-textPrimary">Características</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Number.isFinite(areaValue) && (
                  <StatTile icon={Ruler} value={Math.round(areaValue)} label="m² Total" />
                )}
                {rooms > 0 && (
                  <StatTile icon={BedDouble} value={rooms} label="Habitaciones" />
                )}
                {bathrooms > 0 && (
                  <StatTile icon={Bath} value={bathrooms} label="Baños" />
                )}
                {parkingSpaces > 0 && (
                  <StatTile icon={Car} value={parkingSpaces} label="Parqueaderos" />
                )}
              </div>

              {/* Descripción */}
              {property.description && (
                <>
                  <Separator className="my-6 bg-line" />
                  <h2 className="mb-3 text-lg font-semibold text-textPrimary">Descripción</h2>
                  <p className="whitespace-pre-line leading-relaxed text-textSecondary">
                    {property.description}
                  </p>
                </>
              )}

              {/* Ubicación */}
              {(property.address || property.city) && (
                <>
                  <Separator className="my-6 bg-line" />
                  <h2 className="mb-3 text-lg font-semibold text-textPrimary">Ubicación</h2>
                  <div className="overflow-hidden rounded-card border border-line bg-surface">
                    {property.latitude && property.longitude ? (
                      <PropertyDetailMap
                        latitude={property.latitude}
                        longitude={property.longitude}
                        polygon={property.polygon}
                        status={property.status}
                        price={property.price}
                        title={property.title}
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center bg-muted text-textSecondary">
                        <MapPin className="mr-2 h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
                        Ubicación aproximada disponible en el mapa
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-textSecondary">
                      <MapPin className="h-4 w-4 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                      <span>
                        {property.address && <>{property.address}</>}
                        {property.address && property.city && <>, </>}
                        {property.city && <>{property.city}</>}
                        {property.province && <>, {property.province}</>}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Tarjeta de contacto (sticky) */}
            <aside className="lg:col-span-1">
              <div className="rounded-card border border-line bg-surface p-6 shadow-card lg:sticky lg:top-6">
                <div className="text-xs font-medium uppercase tracking-wide text-textSecondary">
                  Precio
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  {priceIsFinite ? (
                    <AnimatedNumber
                      value={priceValue}
                      prefix="$"
                      className="price text-3xl"
                    />
                  ) : (
                    <span className="price text-2xl">{priceFormatted}</span>
                  )}
                </div>
                {hasRentPrice && (
                  <div className="mt-1 text-sm font-semibold text-textSecondary">
                    Alquiler {rentPriceFormatted}/mes
                  </div>
                )}
                {property.is_negotiable && (
                  <span className="mt-1 inline-block text-sm font-medium text-secondary">
                    Negociable
                  </span>
                )}

                <Separator className="my-5 bg-line" />

                {/* Publicado por */}
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primaryLight text-sm font-bold text-primary">
                    {(property.owner_username || 'U').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs text-textSecondary">{isImported ? 'Fuente' : 'Publicado por'}</div>
                    <div className="truncate font-semibold text-textPrimary">
                      {isImported
                        ? sourceAgency || 'Fuente externa'
                        : property.owner_username || `Usuario ${property.owner}`}
                    </div>
                  </div>
                </div>

                {publishedDate && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-textSecondary">
                    <CalendarDays className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} aria-hidden />
                    {isImported ? 'Agregado al mapa el ' : 'Publicado el '}{publishedDate}
                  </div>
                )}

                {/* CTA de contacto */}
                <div className="flex flex-col gap-3">
                  {isImported ? (
                    contactPhone ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="wa-cta inline-flex w-full items-center justify-center gap-2 rounded-button bg-secondary px-5 py-3 text-base font-semibold text-white shadow-card transition-colors duration-200 hover:bg-secondaryHover focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary/25"
                      >
                        <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden />
                        Contactar por WhatsApp
                      </a>
                    ) : sourceUrl ? (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-button bg-primary px-5 py-3 text-base font-semibold text-white shadow-card transition-colors duration-200 hover:bg-primaryHover focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
                      >
                        <ExternalLink className="h-5 w-5" strokeWidth={2} aria-hidden />
                        Contactar en {sourceAgency || 'la página original'}
                      </a>
                    ) : (
                      <div className="rounded-card border border-line bg-background p-3 text-sm text-textSecondary">
                        Esta propiedad viene de una fuente externa y no tiene contacto disponible.
                      </div>
                    )
                  ) : (
                    contactPhone && (
                      <>
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wa-cta inline-flex w-full items-center justify-center gap-2 rounded-button bg-secondary px-5 py-3 text-base font-semibold text-white shadow-card transition-colors duration-200 hover:bg-secondaryHover focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary/25"
                        >
                          <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden />
                          Contactar por WhatsApp
                        </a>
                        <a
                          href={`tel:${contactPhone}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-button border border-line bg-white px-5 py-3 text-base font-semibold text-textPrimary transition-colors duration-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                        >
                          <Phone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                          {contactPhone}
                        </a>
                      </>
                    )
                  )}

                  <Link
                    href={mapUrl}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-button bg-primary px-5 py-3 text-base font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-primaryHover focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
                  >
                    Ver en el mapa interactivo
                    <ArrowRight className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-button px-5 py-2.5 text-sm font-semibold text-textSecondary transition-colors duration-200 hover:text-primary"
                  >
                    Ver más propiedades
                  </Link>
                </div>

                <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-textSecondary">
                  <BadgeCheck className="h-4 w-4 text-success" strokeWidth={1.75} aria-hidden />
                  {isImported ? 'Anuncio agregado desde fuente externa' : 'Propiedad publicada en Geo Propiedades'}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Rebote discreto del CTA de WhatsApp al pasar el cursor */}
      <style>{`
        @keyframes waBounce {
          0%, 100% { transform: translateY(0); }
          35% { transform: translateY(-4px); }
          65% { transform: translateY(-2px); }
        }
        .wa-cta:hover { animation: waBounce 0.5s ease; }
        @media (prefers-reduced-motion: reduce) {
          .wa-cta:hover { animation: none; }
        }
      `}</style>
    </>
  );
}
