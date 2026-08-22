import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildWhatsAppUrl } from '@/lib/constants';
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
  Navigation,
  CheckCircle2,
  Archive,
  TrendingDown,
} from 'lucide-react';
import {
  jsonLd,
  slugify,
  SITE_URL,
  getProperty,
  PROPERTY_SCHEMA_TYPE,
  getNearbyProperties,
} from '@/lib/properties';
import {
  getPropertyTypeLabel,
  getListingStatusLabel,
  getListingStatusOverlayClass,
  getClosedReason,
  isSuccessfulClosure,
  formatPrice,
  formatArea,
  formatDate,
  type ClosedReason,
} from '@/lib/property-labels';
import { getPropertyPoint } from '@/lib/geo';
import { buildSearchHeading, softenShouting } from '@/lib/property-heading';
import { getPropertyIntelligence } from '@/lib/intelligence';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import PropertyGallery from '@/components/PropertyGallery';
import PropertyNearbyMap from '@/components/maps/PropertyNearbyMap';
import AdminRefreshProperty from '@/components/AdminRefreshProperty';
import PropertyIntelligence from '@/components/PropertyIntelligence';
import AdSlot from '@/components/ads/AdSlot';
import PropertyCard from '@/components/PropertyCard';
import NearbyRail from '@/components/NearbyRail';
import PropertyTitle from '@/components/PropertyTitle';
import BrandAtmosphere from '@/components/aents/BrandAtmosphere';
import RevealableDescription from '@/components/RevealableDescription';
import { normalizeEcuadorPhone } from '@/lib/phone';
import { PhoneReveal, TrackedContactLink } from '@/components/PropertyContactActions';
import PropertyPageActions from '@/components/PropertyPageActions';

// A closed listing keeps its page — the "vendido" image carries its printed
// code and QR, and SOC-002 promises those resolve — so the page has to say so
// out loud instead of looking like any other available listing.
//
// The copy is written as its own clause ("ya se vendió") rather than as an
// adjective, because agreement in Spanish depends on the property type:
// "casa vendida" but "terreno vendido".
const CLOSURE_HEADLINE: Record<ClosedReason, string> = {
  sold: 'Esta propiedad ya se vendió',
  rented: 'Esta propiedad ya se arrendó',
  withdrawn: 'Este anuncio ya no está disponible',
};

const CLOSURE_DETAIL: Record<ClosedReason, string> = {
  sold: 'El anuncio se cerró y ya no recibe contactos. Puedes ver propiedades similares en la misma zona.',
  rented: 'El anuncio se cerró y ya no recibe contactos. Puedes ver propiedades similares en la misma zona.',
  withdrawn:
    'El anunciante retiró esta publicación. Puedes ver otras propiedades disponibles en la misma zona.',
};

/** Short prefix for the <title> and the OG card of a closed listing. */
const CLOSURE_TITLE_PREFIX: Record<ClosedReason, string> = {
  sold: 'Vendido',
  rented: 'Arrendado',
  withdrawn: 'Anuncio retirado',
};

/** Availability the offer keeps once the listing is closed. */
const CLOSURE_AVAILABILITY: Record<ClosedReason, string> = {
  sold: 'https://schema.org/SoldOut',
  rented: 'https://schema.org/OutOfStock',
  withdrawn: 'https://schema.org/Discontinued',
};

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
    <div className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-card border border-line bg-surface/90 px-2 py-2 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cardHover sm:min-h-0 sm:gap-1.5 sm:px-3 sm:py-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primaryLight sm:h-9 sm:w-9">
        <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="font-geo text-lg font-semibold tabular-nums text-textPrimary sm:text-2xl">{value}</div>
      <div className="text-[11px] font-medium leading-tight text-textSecondary sm:text-xs">{label}</div>
    </div>
  );
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
  const closedReason = getClosedReason(property);
  const statusLabel = getListingStatusLabel(property);
  const location = [property.city, property.province].filter(Boolean).join(', ');
  const titleSuffix = location ? ` | ${location}` : '';
  // The title leads with the search, not with the advertiser's headline: what
  // the listing is, the operation and where. The headline follows, calmed down
  // when it arrived shouted, because it carries words no template knows.
  const searchHeading = buildSearchHeading(property);
  const advertiserHeadline = softenShouting(property.title || '');
  const title = closedReason
    ? `${CLOSURE_TITLE_PREFIX[closedReason]}: ${advertiserHeadline}${titleSuffix}`
    : [searchHeading, advertiserHeadline].filter(Boolean).join(' — ');

  // Build detailed description
  const priceFormatted = formatPrice(property.price);
  const areaFormatted = formatArea(property.area);
  const closedDate = formatDate(property.closed_at);
  const summaryParts = closedReason
    ? [
        CLOSURE_HEADLINE[closedReason],
        closedDate ? `Cerrado el ${closedDate}` : null,
        `${propertyTypeLabel}${location ? ` en ${location}` : ''}`,
        areaFormatted ? `Área ${areaFormatted}` : null,
      ].filter(Boolean)
    : [
        `${propertyTypeLabel} ${statusLabel.toLowerCase()}`,
        priceFormatted,
        areaFormatted ? `Área ${areaFormatted}` : null,
        (property.rooms ?? 0) > 0 ? `${property.rooms} habitaciones` : null,
        (property.bathrooms ?? 0) > 0 ? `${property.bathrooms} baños` : null,
        location ? `En ${location}` : null,
      ].filter(Boolean);

  let description = summaryParts.join(' | ');

  if (property.description && !closedReason) {
    const cleanExcerpt = property.description.replace(/\s+/g, ' ').trim();
    description += ` | ${cleanExcerpt.substring(0, 140)}${cleanExcerpt.length > 140 ? '...' : ''}`;
  }

  // Get main image
  const mainImage = property.images?.find((img: any) => img.is_main) || property.images?.[0];
  const imageUrl = mainImage?.image || '/opengraph-image';

  // Base URL for images and page
  const baseUrl = (
    process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://geopropiedadesecuador.com'
  ).replace(/\/+$/, '');
  const propertyUrl = `${baseUrl}/propiedad/${property.id}`;
  const imageAbsoluteUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;
  // A closed listing must not advertise a price to the social crawlers either:
  // `og:price` / `product:price` are read as a live offer.
  const priceAmount = property.price != null && !closedReason ? String(property.price) : null;

  return {
    title,
    description,
    // A closed listing stays reachable (its printed code and QR must resolve)
    // but it must not stay in the index: a searcher who lands on something they
    // cannot buy bounces straight back, and that is exactly the signal Google
    // reads as a low-quality result for the whole domain. `follow` is kept so
    // the links out of it — the city page, the nearby listings — keep counting.
    ...(closedReason
      ? {
          robots: {
            index: false,
            follow: true,
            googleBot: { index: false, follow: true },
          },
        }
      : {}),
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
    // Additional meta tags for Facebook and social platforms. Imported listings
    // may carry no price ("a consultar"), so the price tags are only emitted
    // when there is a real amount: rendering them from a null price used to
    // throw and turn the whole page into a 500 for crawlers.
    other: {
      'fb:app_id': process.env.NEXT_PUBLIC_FB_APP_ID || '',
      'og:type': 'article',
      ...(priceAmount
        ? {
            'og:price:amount': priceAmount,
            'og:price:currency': 'USD',
            'product:price:amount': priceAmount,
            'product:price:currency': 'USD',
          }
        : {}),
      'article:published_time': property.source_published_at || property.imported_at || property.created_at || new Date().toISOString(),
      'article:author': property.owner_username || 'Geo Propiedades Ecuador',
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

  // The cards need four results, while the map needs a wider candidate set so
  // it can choose a useful zoom for the actual viewport.
  // The API hands back sixty candidates inside the same window whatever we ask
  // for, so a longer rail costs no extra request. The map keeps twelve: more
  // pins than that stop being a neighbourhood and start being noise.
  // The analysis travels with the page instead of arriving after hydration:
  // it is the only content on a ficha that is not the advertiser's, so it has
  // to be in the HTML a crawler reads. Both calls go out at once.
  const [nearbyProperties, intelligence] = await Promise.all([
    getNearbyProperties(property, 30),
    getPropertyIntelligence(property.id),
  ]);
  const mapNearbyProperties = nearbyProperties.slice(0, 12);
  // A listing published without coordinates and without a drawn shape has
  // nothing to put on a map: the camera would open over the whole country under
  // a heading promising this location. The section stays out in that case.
  const mapPoint = getPropertyPoint(property);

  const mapUrl = `/?property=${resolvedParams.id}`;
  const propertyTypeLabel = getPropertyTypeLabel(property.property_type);
  // The `h1` describes the listing the way somebody searches for it. The
  // advertiser's own headline keeps its place right below — it is the seller's
  // voice — only calmed down when it arrived in capitals.
  const pageHeading = buildSearchHeading(property);
  const advertiserHeadline = softenShouting(property.title || '');
  // `status` alone cannot tell a sold listing from a withdrawn one: both are
  // `inactive`, and only `closed_reason` separates them.
  const closedReason = getClosedReason(property);
  const isClosed = closedReason !== '';
  const closedSuccessfully = isSuccessfulClosure(property);
  const closedDate = formatDate(property.closed_at);
  const statusLabel = getListingStatusLabel(property);
  // Fallback name for the structured data of a listing with no title. A closed
  // one drops the operation: "Casa Vendido" does not agree in Spanish.
  const schemaFallbackName = isClosed ? propertyTypeLabel : `${propertyTypeLabel} ${statusLabel}`;
  const priceFormatted = formatPrice(property.price);
  const mainImage = property.images?.find((img: any) => img.is_main) || property.images?.[0];
  const areaFormatted = formatArea(property.area);
  const rooms = property.rooms ?? 0;
  const bathrooms = property.bathrooms ?? 0;
  const parkingSpaces = property.parking_spaces ?? 0;
  const location = [property.city, property.province].filter(Boolean).join(', ');
  const summaryParts = [
    isClosed ? propertyTypeLabel : `${propertyTypeLabel} ${statusLabel.toLowerCase()}`,
    isClosed ? null : priceFormatted,
    areaFormatted ? `Área ${areaFormatted}` : null,
    rooms > 0 ? `${rooms} habitaciones` : null,
    bathrooms > 0 ? `${bathrooms} baños` : null,
    location ? `En ${location}` : null,
  ].filter(Boolean);

  // Get absolute URL for images
  const baseUrl = (
    process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://geopropiedadesecuador.com'
  ).replace(/\/+$/, '');
  const imageUrl = mainImage?.image || '/opengraph-image';
  const imageAbsoluteUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;
  const propertyUrl = `${baseUrl}/propiedad/${property.id}`;
  const areaValue = Number.parseFloat(String(property.area ?? ''));
  const listingStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': `${propertyUrl}#listing`,
    mainEntityOfPage: propertyUrl,
    inLanguage: 'es-EC',
    name: property.title || schemaFallbackName,
    description:
      property.description ||
      (isClosed ? `${propertyTypeLabel} en Ecuador` : `${propertyTypeLabel} ${statusLabel.toLowerCase()} en Ecuador`),
    url: propertyUrl,
    image:
      (property.images?.length ?? 0) > 0
        ? property.images!
            .slice(0, 5)
            .map((img: any) => (img.image.startsWith('http') ? img.image : `${baseUrl}${img.image}`))
        : [imageAbsoluteUrl],
    datePosted: property.source_published_at || property.imported_at || property.created_at,
    dateModified: property.source_updated_at || property.updated_at || property.created_at,
    publisher: { '@id': `${SITE_URL}/#organization` },
    // Listings imported as "a consultar" carry no price. Emitting an Offer with
    // an undefined price is invalid structured data, so the price fields are
    // dropped and the offer is still published for its availability and URL.
    //
    // A closed listing drops the price for a different reason: the property is
    // no longer on offer, and `price` inside an Offer states what it costs to
    // buy it *now*. Keeping the figure next to SoldOut is a contradiction Google
    // is entitled to treat as a misleading rich result. The Offer itself stays,
    // because it is what carries the availability and the described property.
    offers: {
      '@type': 'Offer',
      ...(property.price != null && !isClosed
        ? { price: String(property.price), priceCurrency: 'USD' }
        : {}),
      availability: isClosed
        ? CLOSURE_AVAILABILITY[closedReason]
        : property.status === 'inactive'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
      url: propertyUrl,
      itemOffered: {
        '@type': PROPERTY_SCHEMA_TYPE[property.property_type] || 'Residence',
        name: property.title || schemaFallbackName,
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
        name: property.title || schemaFallbackName,
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
  // Nobody is asked to enquire about something that is already sold, so a
  // closed listing carries no phone and no link to the original ad. Blanking
  // both here removes every contact CTA at the source — price card, sticky
  // card and mobile bar — instead of guarding each of them separately.
  const contactPhone =
    !isClosed && typeof property.contact_phone === 'string' ? property.contact_phone.trim() : '';
  const waPhone = normalizeEcuadorPhone(contactPhone);
  const sourceUrl =
    !isClosed && typeof property.source_url === 'string' ? property.source_url.trim() : '';
  const sourceAgency = typeof property.source_agency === 'string' ? property.source_agency.trim() : '';
  // Where an interested visitor goes instead: the same city, still available.
  const similarUrl = property.city ? `/propiedades/${slugify(property.city)}` : '/propiedades';
  const similarLabel = property.city ? `Ver propiedades en ${property.city}` : 'Ver propiedades disponibles';
  // Only a listing that is both active and located can be pointed at on the
  // general map; the rest send the visitor to the zone instead.
  const showsOnMap = !isClosed && Boolean(mapPoint);
  // `previous_price` is the price asked before the current one — it can be a
  // rise, so only a real drop is announced.
  const previousPriceValue = Number.parseFloat(String(property.previous_price ?? ''));
  const hasPriceDrop =
    !isClosed &&
    priceIsFinite &&
    Number.isFinite(previousPriceValue) &&
    previousPriceValue > priceValue;
  const priceChangedDate = hasPriceDrop ? formatDate(property.price_changed_at) : '';
  // Mensaje de WhatsApp con referencia al anuncio y la URL de su ficha en nuestro sitio.
  const waMessage = `Hola, vi este anuncio en Geo Propiedades: ${property.title || 'esta propiedad'}\n${propertyUrl}`;
  // Where an enquiry goes when the listing carries no advertiser phone. It used
  // to leave the site; now it reaches us, which is both a lead and one less
  // place where the shape of the catalogue is visible from outside.
  const portalHelpUrl = buildWhatsAppUrl(
    `Hola, me interesa esta propiedad de Geo Propiedades: ${property.title || 'esta propiedad'}\n${propertyUrl}`
  );
  const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`;
  const contactTrackingProps = {
    propertyId: property.id,
    city: property.city,
    province: property.province,
    propertyType: property.property_type,
    status: property.status,
    imported: isImported,
  };
  const publicationDate = isImported
    ? property.source_published_at || property.imported_at || property.created_at
    : property.created_at;
  const publicationLabel = isImported
    ? (property.source_published_at ? 'Publicado originalmente el ' : 'Detectado en Geo Propiedades el ')
    : 'Publicado el ';
  const publishedDate = publicationDate
    ? new Date(publicationDate).toLocaleDateString('es-EC', {
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
      {/* overflow-x-clip (not hidden) trims the full-bleed map section's
          scrollbar-width overhang without creating a scroll container, so the
          sticky contact card keeps tracking the document scroll. */}
      <div className="aents-page-shell relative min-h-[calc(100dvh-var(--app-header-height))] overflow-x-clip bg-background pb-20 lg:pb-16">
        <BrandAtmosphere className="opacity-45" />
        <div className="relative mx-auto max-w-6xl px-3 pt-3 sm:px-4 sm:pt-8">
          {/* Breadcrumb */}
          <nav aria-label="Migas de pan" className="mb-3 sm:mb-6">
            <ol className="flex flex-nowrap items-center gap-1.5 overflow-hidden text-xs text-textSecondary sm:flex-wrap sm:text-sm">
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

          {/* Anuncio cerrado: lo primero que se lee, antes que las fotos. */}
          {isClosed && (
            <section
              aria-labelledby="closed-listing-title"
              className={`mb-6 rounded-card border p-5 shadow-card ${
                closedSuccessfully ? 'border-primary/25 bg-primaryLight' : 'border-line bg-muted'
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${
                      closedSuccessfully ? 'bg-primary text-white' : 'bg-textSecondary/15 text-textSecondary'
                    }`}
                  >
                    {closedSuccessfully ? (
                      <CheckCircle2 className="h-5 w-5" strokeWidth={2} aria-hidden />
                    ) : (
                      <Archive className="h-5 w-5" strokeWidth={2} aria-hidden />
                    )}
                  </span>
                  <div>
                    <h2 id="closed-listing-title" className="text-lg font-bold text-textPrimary">
                      {CLOSURE_HEADLINE[closedReason]}
                    </h2>
                    {closedDate && (
                      <p className="mt-0.5 text-sm font-medium text-textSecondary">Cerrado el {closedDate}</p>
                    )}
                    <p className="mt-1 max-w-prose text-sm text-textSecondary">{CLOSURE_DETAIL[closedReason]}</p>
                  </div>
                </div>
                <Link
                  href={similarUrl}
                  className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-button bg-primary px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-primaryHover"
                >
                  {similarLabel}
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                </Link>
              </div>
            </section>
          )}

          {/* Galería de fotos con mosaico, miniaturas y vista ampliada */}
          {galleryImages.length > 0 ? (
            <PropertyGallery
              images={galleryImages}
              title={property.title || 'Propiedad'}
              statusLabel={statusLabel}
              propertyTypeLabel={propertyTypeLabel}
              statusClassName={getListingStatusOverlayClass(property)}
            />
          ) : (
            <div className="flex aspect-[16/7] w-full items-center justify-center rounded-hero border border-line bg-muted text-textSecondary">
              <div className="flex flex-col items-center gap-2">
                <Home className="h-10 w-10" strokeWidth={1.5} aria-hidden />
                <span className="text-sm font-medium">Sin imágenes disponibles</span>
              </div>
            </div>
          )}

          <section className="mt-2 rounded-card border border-line bg-surface p-3 shadow-card sm:mt-4 sm:p-5">
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-primaryLight text-primary hover:bg-primaryLight">
                    {propertyTypeLabel}
                  </Badge>
                  <Badge className={`rounded-full border-transparent ${getListingStatusOverlayClass(property)}`}>
                    {statusLabel}
                  </Badge>
                  {property.is_negotiable && !isClosed && (
                    <Badge className="rounded-full border-transparent bg-secondary/10 text-secondary hover:bg-secondary/10">
                      Precio negociable
                    </Badge>
                  )}
                  {isImported && <AdminRefreshProperty propertyId={property.id} />}
                </div>
                <PropertyTitle className="mt-2 sm:mt-3">
                  {pageHeading}
                </PropertyTitle>
                {advertiserHeadline && advertiserHeadline !== pageHeading && (
                  <p className="mt-1 text-base font-medium text-textSecondary sm:text-lg">
                    {advertiserHeadline}
                  </p>
                )}
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

              <div className="rounded-card border border-line bg-background p-3 sm:p-4 lg:min-w-80">
                <div className="text-xs font-medium uppercase tracking-wide text-textSecondary">
                  {isClosed ? 'Último precio publicado' : 'Precio'}
                </div>
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
                {hasPriceDrop && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-secondary">
                    <TrendingDown className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Bajó desde {formatPrice(previousPriceValue)}
                    {priceChangedDate ? ` el ${priceChangedDate}` : ''}
                  </div>
                )}
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {contactPhone ? (
                    <TrackedContactLink
                      href={waLink}
                      method="whatsapp"
                      source="property_page_price_card"
                      {...contactTrackingProps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wa-cta inline-flex items-center justify-center gap-2 rounded-button bg-secondary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondaryHover"
                    >
                      <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
                      WhatsApp
                    </TrackedContactLink>
                  ) : (
                    /* No advertiser phone. This used to send the visitor to the
                       listing's page elsewhere, which gave away how the
                       catalogue is built and handed the enquiry to somebody
                       else. Our own line keeps both. */
                    <TrackedContactLink
                      href={portalHelpUrl}
                      method="portal_help"
                      source="property_page_price_card"
                      {...contactTrackingProps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wa-cta inline-flex items-center justify-center gap-2 rounded-button bg-secondary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondaryHover"
                    >
                      <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Consultar por esta propiedad
                    </TrackedContactLink>
                  )}
                  {/* A closed listing is off the map (it is `inactive`), and one
                      published without a position was never on it, so the map
                      link would land on an empty viewport. The zone is what is
                      still useful about them. */}
                  <Link
                    href={showsOnMap ? mapUrl : similarUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-button border border-line bg-white px-4 py-2.5 text-sm font-semibold text-textPrimary transition-colors hover:border-primary hover:text-primary"
                  >
                    {showsOnMap ? 'Ver en mapa' : similarLabel}
                    <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* The intelligence endpoint compares a listing against the active
              inventory of its zone and answers 404 once the listing leaves it.
              Mounted unconditionally, a closed ficha paints the full skeleton,
              throws the 404 into the console and then collapses it again —
              a block of the page appearing and vanishing for nothing. */}
          {!isClosed && intelligence && <PropertyIntelligence data={intelligence} />}

          {/* Cuerpo: contenido + tarjeta de contacto */}
          <div className="mt-4 grid grid-cols-1 gap-6 sm:mt-8 sm:gap-8 lg:grid-cols-3">
            {/* Columna principal */}
            <div className="lg:col-span-2">
              <div className="mb-2 hidden flex-wrap items-center gap-2 lg:flex">
                <Badge className="rounded-full bg-primaryLight text-primary hover:bg-primaryLight">
                  {propertyTypeLabel}
                </Badge>
                {property.is_negotiable && !isClosed && (
                  <Badge className="rounded-full border-transparent bg-secondary/10 text-secondary hover:bg-secondary/10">
                    Precio negociable
                  </Badge>
                )}
              </div>

              <p className="text-sm leading-5 text-textSecondary lg:mt-3">{summaryParts.join(' • ')}</p>

              <Separator className="my-4 bg-line sm:my-6" />

              {/* Características */}
              <h2 className="mb-2 text-base font-semibold text-textPrimary sm:mb-4 sm:text-lg">Características</h2>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-4">
                {Number.isFinite(areaValue) && (
                  <StatTile icon={Ruler} value={Math.round(areaValue)} label="m² total" />
                )}
                {rooms > 0 && (
                  <StatTile icon={BedDouble} value={rooms} label="Habitaciones" />
                )}
                {bathrooms > 0 && (
                  <StatTile icon={Bath} value={bathrooms} label="Baños" />
                )}
                {parkingSpaces > 0 && (
                  <StatTile icon={Car} value={parkingSpaces} label="Parqueos" />
                )}
              </div>

              {/* Descripción */}
              {property.description && (
                <>
                  <Separator className="my-4 bg-line sm:my-6" />
                  <h2 className="mb-2 text-base font-semibold text-textPrimary sm:mb-3 sm:text-lg">Descripción</h2>
                  <RevealableDescription
                    text={property.description}
                    source="property_page_description_text"
                    {...contactTrackingProps}
                    className="whitespace-pre-line leading-relaxed text-textSecondary"
                  />
                </>
              )}

            </div>

            {/* Tarjeta de contacto (sticky) */}
            <aside className="hidden lg:col-span-1 lg:block">
              {/* Sticks below the fixed header, not at the viewport edge: with
                  `top-6` the card parked underneath the bar. */}
              <div className="isolate z-10 rounded-card border border-line bg-surface p-6 shadow-card lg:sticky lg:top-[calc(var(--app-header-height)+1.5rem)]">
                <div className="text-xs font-medium uppercase tracking-wide text-textSecondary">
                  {isClosed ? 'Último precio publicado' : 'Precio'}
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
                {hasPriceDrop && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-secondary">
                    <TrendingDown className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Bajó desde {formatPrice(previousPriceValue)}
                    {priceChangedDate ? ` el ${priceChangedDate}` : ''}
                  </div>
                )}
                {property.is_negotiable && !isClosed && (
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
                    {publicationLabel}{publishedDate}
                  </div>
                )}

                {/* CTA de contacto */}
                <div className="flex flex-col gap-3">
                  {contactPhone && (
                    <div className="flex items-center justify-center gap-2 rounded-button border border-line bg-background px-5 py-3 text-sm">
                      <Phone className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden />
                      <PhoneReveal
                        phone={`+${waPhone}`}
                        source="property_page_contact_section"
                        {...contactTrackingProps}
                      />
                    </div>
                  )}
                  {isClosed ? (
                    <div className="rounded-card border border-line bg-background p-4 text-sm text-textSecondary">
                      <p className="font-semibold text-textPrimary">{CLOSURE_HEADLINE[closedReason]}</p>
                      <p className="mt-1">
                        Este anuncio ya no recibe contactos
                        {closedDate ? ` desde el ${closedDate}` : ''}.
                      </p>
                    </div>
                  ) : isImported ? (
                    contactPhone ? (
                      <TrackedContactLink
                        href={waLink}
                        method="whatsapp"
                        source="property_page_contact_section"
                        {...contactTrackingProps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="wa-cta inline-flex w-full items-center justify-center gap-2 rounded-button bg-secondary px-5 py-3 text-base font-semibold text-white shadow-card transition-colors duration-200 hover:bg-secondaryHover focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary/25"
                      >
                        <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden />
                        Contactar por WhatsApp
                      </TrackedContactLink>
                    ) : (
                      <TrackedContactLink
                        href={portalHelpUrl}
                        method="portal_help"
                        source="property_page_contact_section"
                        {...contactTrackingProps}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="wa-cta inline-flex w-full items-center justify-center gap-2 rounded-button bg-secondary px-5 py-3 text-base font-semibold text-white shadow-card transition-colors duration-200 hover:bg-secondaryHover focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary/25"
                      >
                        <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden />
                        Consultar por esta propiedad
                      </TrackedContactLink>
                    )
                  ) : (
                    contactPhone && (
                      <>
                        <TrackedContactLink
                          href={waLink}
                          method="whatsapp"
                          source="property_page_contact_section"
                          {...contactTrackingProps}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wa-cta inline-flex w-full items-center justify-center gap-2 rounded-button bg-secondary px-5 py-3 text-base font-semibold text-white shadow-card transition-colors duration-200 hover:bg-secondaryHover focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary/25"
                        >
                          <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden />
                          Contactar por WhatsApp
                        </TrackedContactLink>
                        <TrackedContactLink
                          href={`tel:+${waPhone}`}
                          method="call"
                          source="property_page_contact_section"
                          {...contactTrackingProps}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-button border border-line bg-white px-5 py-3 text-base font-semibold text-textPrimary transition-colors duration-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                        >
                          <Phone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                          Llamar
                        </TrackedContactLink>
                      </>
                    )
                  )}

                  <Link
                    href={isClosed ? similarUrl : mapUrl}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-button bg-primary px-5 py-3 text-base font-semibold text-white shadow-card transition-colors duration-200 hover:bg-primaryHover focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
                  >
                    {isClosed ? similarLabel : 'Ver en el mapa interactivo'}
                    <ArrowRight className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-button px-5 py-2.5 text-sm font-semibold text-textSecondary transition-colors duration-200 hover:text-primary"
                  >
                    Ver más propiedades
                  </Link>
                </div>

                {!isImported && (
                  <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-textSecondary">
                    <BadgeCheck className="h-4 w-4 text-success" strokeWidth={1.75} aria-hidden />
                    Propiedad publicada en Geo Propiedades
                  </div>
                )}
              </div>

              {/* Below the contact card, never inside it: that click belongs to
                  whoever published the property (ADS-004). */}
              <AdSlot
                placement="property_sidebar"
                seed={String(property.id)}
                city={property.city}
                province={property.province}
                variant="aside"
                className="mt-6"
              />
            </aside>
          </div>

          {/* The explorer spans the full viewport so locations can be compared
              without confining the map to the details text column. */}
          {mapPoint && (
          <section className="relative left-1/2 mt-6 w-screen -translate-x-1/2 border-y border-line bg-surface sm:mt-10" aria-labelledby="property-map-title">
            <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-4">
              <h2 id="property-map-title" className="text-base font-semibold text-textPrimary sm:text-lg">Ubicación y propiedades cercanas</h2>
              <div className="mt-1 flex items-start gap-2 text-sm text-textSecondary">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                <span>
                  {property.address && <>{property.address}</>}
                  {property.address && property.city && <>, </>}
                  {property.city && <>{property.city}</>}
                  {property.province && <>, {property.province}</>}
                  {!property.address && !property.city && !property.province && <>Ubicación no especificada</>}
                </span>
              </div>
              <p className="mt-1 text-xs text-textSecondary">
                Mueve el mapa para cargar esa zona. Selecciona un marcador para abrir su ficha completa.
              </p>
            </div>
            <PropertyNearbyMap property={property} nearbyProperties={mapNearbyProperties} />
          </section>
          )}

          <AdSlot
            placement="property_footer"
            seed={String(property.id)}
            city={property.city}
            province={property.province}
            variant="banner"
            className="mt-6 sm:mt-12"
          />

          {nearbyProperties.length > 0 && (
            <section className="mt-8 border-t border-line pt-6 sm:mt-12 sm:pt-10" aria-labelledby="nearby-properties-title">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-primary">
                    <Navigation className="h-4 w-4" aria-hidden />
                    Cerca de esta ubicación
                  </div>
                  <h2 id="nearby-properties-title" className="text-2xl font-bold text-textPrimary">
                    Publicaciones cercanas
                  </h2>
                  <p className="mt-1 text-sm text-textSecondary">
                    Ordenadas desde la propiedad más próxima. La distancia es aproximada en línea recta.
                  </p>
                </div>
              </div>

              <NearbyRail
                properties={nearbyProperties}
                mapHref={isClosed ? similarUrl : mapUrl}
                mapLabel={isClosed ? similarLabel : 'Explorar en el mapa'}
              />
            </section>
          )}
        </div>
      </div>

      {/* Contacto siempre a mano en móvil: la tarjeta sticky solo existe en
          desktop, así que en el teléfono había que recorrer toda la ficha para
          encontrar el botón de WhatsApp. */}
      <PropertyPageActions
        {...contactTrackingProps}
        whatsappUrl={contactPhone ? waLink : ''}
        phone={contactPhone ? waPhone : ''}
        sourceUrl={sourceUrl}
        sourceAgency={sourceAgency}
        unavailableLabel={isClosed ? similarLabel : undefined}
        unavailableHref={isClosed ? similarUrl : undefined}
        shareUrl={propertyUrl}
        shareTitle={property.title || 'Propiedad en Geo Propiedades'}
        shareDescription={[priceFormatted, [property.city, property.province].filter(Boolean).join(', ')]
          .filter(Boolean)
          .join(' • ')}
      />

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
