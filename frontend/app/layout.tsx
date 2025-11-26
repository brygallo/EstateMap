import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import 'react-toastify/dist/ReactToastify.css';
import 'leaflet/dist/leaflet.css';
import { AuthProvider } from '@/lib/auth-context';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { ToastContainer } from 'react-toastify';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: {
    default: 'Geo Propiedades Ecuador - Encuentra tu Propiedad Ideal',
    template: '%s | Geo Propiedades Ecuador',
  },
  description:
    'Plataforma de búsqueda y gestión de propiedades en Ecuador. Encuentra casas, departamentos, terrenos y más con nuestra herramienta de mapas interactivos.',
  keywords: [
    'propiedades',
    'inmobiliaria',
    'Ecuador',
    'casas',
    'departamentos',
    'terrenos',
    'bienes raíces',
    'venta',
    'alquiler',
  ],
  authors: [{ name: 'Geo Propiedades Ecuador' }],
  creator: 'Geo Propiedades Ecuador',
  publisher: 'Geo Propiedades Ecuador',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://estatemap.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Geo Propiedades Ecuador - Encuentra tu Propiedad Ideal',
    description:
      'Plataforma de búsqueda y gestión de propiedades en Ecuador. Encuentra casas, departamentos, terrenos y más.',
    url: '/',
    siteName: 'Geo Propiedades Ecuador',
    locale: 'es_EC',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Geo Propiedades Ecuador - Encuentra tu Propiedad Ideal',
    description:
      'Plataforma de búsqueda y gestión de propiedades en Ecuador. Encuentra casas, departamentos, terrenos y más.',
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
  return (
    <html lang="es" className={poppins.variable}>
      <body className="font-sans">
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
