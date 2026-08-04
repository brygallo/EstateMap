import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import NavBar from '@/components/NavBar';
import MobileTabBar from '@/components/MobileTabBar';
import Footer from '@/components/Footer';
import { Toaster } from 'sonner';
import { WHATSAPP_NUMBER } from '@/lib/constants';
import AnalyticsPageView from '@/components/AnalyticsPageView';

// Aents typography. The families come from the Brand Book; next/font self-hosts
// them, so no request leaves for a font CDN. The variable names match the ones
// the token bridge publishes, and the token file keeps the fallback chain.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

const siteUrl = (
  process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://geopropiedadesecuador.com'
).replace(/\/+$/, '');

// Next's default viewport tag omits `viewport-fit`, which leaves every
// `env(safe-area-inset-*)` in the app resolving to 0 — the map FAB, the detail
// sheet's action bar and the lightbox close button were all sitting under the
// notch and the gesture bar. `cover` is what turns those insets on.
//
// The page is left zoomable on purpose: pinch-to-zoom is the only way a
// low-vision visitor can read a listing, and locking it costs more than the
// stray double-tap zoom it prevents.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Matches `--background`, which is what `.aents-site-header` paints itself
  // with, so the iOS address bar and the Android status bar read as a
  // continuation of the header instead of a seam above it. The dark token set
  // is opt-in via `data-scheme` and nothing sets it, so one value is enough.
  themeColor: '#FFFFFF',
};

export const metadata: Metadata = {
  title: {
    default: 'Geo Propiedades Ecuador - Propiedades en un solo mapa',
    template: '%s | Geo Propiedades Ecuador',
  },
  description:
    'Plataforma inmobiliaria en Ecuador para comprar, vender y alquilar propiedades en un solo mapa. Encuentra casas, departamentos, terrenos y locales cerca de ti sin saltar entre portales.',
  keywords: [
    'propiedades en Ecuador',
    'inmobiliaria Ecuador',
    'casas en venta Ecuador',
    'departamentos en alquiler Ecuador',
    'terrenos en venta Ecuador',
    'bienes raíces Ecuador',
    'mapa inmobiliario',
    'propiedades cerca de mí',
    'propiedades en un mapa',
    'portal inmobiliario',
    'propiedades Quito',
    'propiedades Guayaquil',
    'propiedades Cuenca',
    'venta',
    'alquiler',
  ],
  applicationName: 'Geo Propiedades Ecuador',
  // Installed on iOS, the page runs without browser chrome; `default` keeps the
  // status bar legible over the white header instead of letting content slide
  // under it.
  appleWebApp: {
    capable: true,
    title: 'Geo Propiedades',
    statusBarStyle: 'default',
  },
  authors: [{ name: 'Geo Propiedades Ecuador' }],
  creator: 'Geo Propiedades Ecuador',
  publisher: 'Geo Propiedades Ecuador',
  category: 'Real Estate',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Geo Propiedades Ecuador - Propiedades en un solo mapa',
    description:
      'Busca casas, departamentos, terrenos y locales en Ecuador desde un mapa interactivo con ubicación clara, filtros y contacto directo.',
    url: siteUrl,
    siteName: 'Geo Propiedades Ecuador',
    locale: 'es_EC',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: 'Geo Propiedades Ecuador - propiedades en un solo mapa',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Geo Propiedades Ecuador - Propiedades en un solo mapa',
    description:
      'Encuentra propiedades cerca de ti, compra, alquila o vende con mapa, filtros y contacto directo.',
    images: [`${siteUrl}/opengraph-image`],
  },
  other: {
    'geo.region': 'EC',
    'geo.placename': 'Ecuador',
    'geo.position': '-1.8312;-78.1834',
    ICBM: '-1.8312, -78.1834',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    // iOS ignores the manifest for the home-screen icon and reads this tag, and
    // it only accepts PNG. The bled export avoids the white halo iOS composites
    // behind a transparent source.
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-5SV6BS59';
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-EFL9GZT063';
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Geo Propiedades Ecuador',
        url: siteUrl,
        description:
          'Portal inmobiliario en Ecuador para buscar, comprar, alquilar, vender y publicar casas, terrenos, departamentos y locales comerciales en un solo mapa interactivo.',
        areaServed: {
          '@type': 'Country',
          name: 'Ecuador',
        },
        logo: `${siteUrl}/icon-512.png`,
        knowsAbout: [
          'propiedades en Ecuador',
          'casas en venta',
          'terrenos en venta',
          'departamentos en alquiler',
          'locales comerciales',
          'mapa inmobiliario',
          'propiedades cerca de mí',
          'propiedades en un mapa',
          'publicación de propiedades',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          telephone: `+${WHATSAPP_NUMBER}`,
          areaServed: 'EC',
          availableLanguage: ['es'],
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'Geo Propiedades Ecuador',
        url: siteUrl,
        inLanguage: 'es-EC',
        publisher: { '@id': `${siteUrl}/#organization` },
        description:
          'Sitio para encontrar propiedades en Ecuador en un solo mapa, por ubicación cercana, ciudad, provincia, precio, área, tipo de inmueble y tipo de operación.',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Service',
        '@id': `${siteUrl}/#real-estate-search-service`,
        name: 'Búsqueda de propiedades en mapa',
        provider: { '@id': `${siteUrl}/#organization` },
        areaServed: {
          '@type': 'Country',
          name: 'Ecuador',
        },
        serviceType: 'Real estate listing search',
        description:
          'Búsqueda de casas, terrenos, departamentos y locales comerciales en Ecuador en un mapa interactivo, con filtros, ubicación visible y contacto directo con anunciantes.',
      },
    ],
  };

  return (
    <html lang="es" className={`${jakarta.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <AnalyticsPageView />
        <link rel="preconnect" href="https://minio.geopropiedadesecuador.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <Script
          id="sw-cleanup-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                if (!('serviceWorker' in navigator)) return;

                var cleanupKey = 'sw-cleanup-v1';
                var hasRun = false;
                try {
                  hasRun = window.localStorage && localStorage.getItem(cleanupKey) === 'done';
                } catch (e) {}
                if (hasRun) return;

                var run = function () {
                  navigator.serviceWorker.getRegistrations()
                    .then(function (registrations) {
                      return Promise.all(
                        registrations.map(function (registration) {
                          return registration.unregister();
                        })
                      );
                    })
                    .catch(function () {});

                  if ('caches' in window) {
                    caches.keys()
                      .then(function (keys) {
                        return Promise.all(
                          keys.map(function (key) {
                            return caches.delete(key);
                          })
                        );
                      })
                      .catch(function () {});
                  }

                  try {
                    if (window.localStorage) {
                      localStorage.setItem(cleanupKey, 'done');
                    }
                  } catch (e) {}
                };

                if (document.readyState === 'complete') {
                  run();
                } else {
                  window.addEventListener('load', run, { once: true });
                }
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {gaMeasurementId && (
          <>
            <Script
              id="ga-script"
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga-inline-script"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaMeasurementId}');
                `,
              }}
            />
          </>
        )}
        {gtmId && (
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
        )}
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
              title="Google Tag Manager"
            />
          </noscript>
        )}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        <AuthProvider>
          <div className="min-h-screen flex flex-col bg-background text-textPrimary">
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-top focus:rounded-button focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-card"
            >
              Saltar al contenido
            </a>
            <NavBar />
            <main
              id="main"
              tabIndex={-1}
              // The bottom padding clears the mobile tab bar (its own height
              // plus the gesture-bar inset) so the last row of any page stays
              // reachable. It collapses at md, where the bar is hidden.
              className="flex-grow pt-[var(--app-header-height)] pb-[calc(var(--mobile-tabbar-height)+env(safe-area-inset-bottom))] focus:outline-none md:pb-0"
            >
              {children}
            </main>
            <Footer />
            <MobileTabBar />
          </div>
          <Toaster
            richColors
            position="top-center"
            className="app-toaster"
            toastOptions={{
              classNames: {
                toast: 'app-toast',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
