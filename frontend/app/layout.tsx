import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import Script from 'next/script';
import './globals.css';
import 'react-toastify/dist/ReactToastify.css';
import 'leaflet/dist/leaflet.css';
import { AuthProvider } from '@/lib/auth-context';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { ToastContainer } from 'react-toastify';

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://geopropiedadesecuador.com';

export const metadata: Metadata = {
  title: {
    default: 'Geo Propiedades Ecuador - Encuentra tu Propiedad Ideal',
    template: '%s | Geo Propiedades Ecuador',
  },
  description:
    'Plataforma inmobiliaria en Ecuador para comprar, vender y alquilar propiedades. Encuentra casas, departamentos, terrenos y locales en Quito, Guayaquil, Cuenca y más con mapas interactivos.',
  keywords: [
    'propiedades en Ecuador',
    'inmobiliaria Ecuador',
    'casas en venta Ecuador',
    'departamentos en alquiler Ecuador',
    'terrenos en venta Ecuador',
    'bienes raíces Ecuador',
    'mapa inmobiliario',
    'portal inmobiliario',
    'propiedades Quito',
    'propiedades Guayaquil',
    'propiedades Cuenca',
    'venta',
    'alquiler',
  ],
  applicationName: 'Geo Propiedades Ecuador',
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
    title: 'Geo Propiedades Ecuador - Encuentra tu Propiedad Ideal',
    description:
      'Plataforma de búsqueda y gestión de propiedades en Ecuador. Encuentra casas, departamentos, terrenos y más.',
    url: siteUrl,
    siteName: 'Geo Propiedades Ecuador',
    locale: 'es_EC',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Geo Propiedades Ecuador - Encuentra tu Propiedad Ideal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Geo Propiedades Ecuador - Encuentra tu Propiedad Ideal',
    description:
      'Plataforma de búsqueda y gestión de propiedades en Ecuador. Encuentra casas, departamentos, terrenos y más.',
    images: [`${siteUrl}/og-image.png`],
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
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: [
      { url: '/icon-180x180.svg' },
      { url: '/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
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
        name: 'Geo Propiedades Ecuador',
        url: siteUrl,
        description:
          'Plataforma inmobiliaria en Ecuador para comprar, vender y alquilar propiedades con mapas interactivos.',
        areaServed: 'EC',
        logo: `${siteUrl}/icon-192x192.svg`,
      },
      {
        '@type': 'WebSite',
        name: 'Geo Propiedades Ecuador',
        url: siteUrl,
        inLanguage: 'es-EC',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/?search={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">
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
            <NavBar />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </AuthProvider>
      </body>
    </html>
  );
}
