const withPWA = require('next-pwa')({
  dest: 'public',
  register: false,
  skipWaiting: true,
  // Keep PWA tooling installed but fully disabled to prevent stale SW caches.
  disable: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for Docker
  // Permite aislar la carpeta de build (evita que un `next dev` en el host y el
  // server en Docker compartan `.next` y se corrompan). Por defecto es `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  images: {
    // En desarrollo, MinIO está en localhost:9000 y el servidor de Next (dentro
    // del contenedor) no puede alcanzarlo para optimizar -> la miniatura falla.
    // Desactivamos la optimización solo en dev; el navegador baja la imagen
    // directo. En producción (MinIO en dominio público) la optimización queda ON.
    unoptimized: process.env.NODE_ENV !== 'production',
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/estatemap/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '9000',
        pathname: '/estatemap/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
        pathname: '/estatemap/**',
      },
      {
        protocol: 'https',
        hostname: '127.0.0.1',
        port: '9000',
        pathname: '/estatemap/**',
      },
      {
        protocol: 'https',
        hostname: 'minio.geopropiedadesecuador.com',
        pathname: '/estatemap/**',
      },
    ],
  },
  async headers() {
    // Cabeceras de seguridad aplicadas a todas las rutas. No se incluye
    // Content-Security-Policy aquí a propósito: requiere una allowlist afinada
    // (GTM/GA, Google Identity, MapLibre/Leaflet, tiles de OSM, MinIO) y una CSP
    // mal formada rompería el mapa o el analytics. Queda como follow-up.
    const securityHeaders = [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), payment=(), geolocation=(self)',
      },
    ];

    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      // Canonicaliza el host: `www` -> apex (evita contenido duplicado en dos
      // hosts). Corre en el server de Next, que está en la ruta de request.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.geopropiedadesecuador.com' }],
        destination: 'https://geopropiedadesecuador.com/:path*',
        permanent: true,
      },
      { source: '/add-property', destination: '/publicar-propiedad', permanent: true },
      { source: '/my-properties', destination: '/mis-propiedades', permanent: true },
      { source: '/edit-property/:path*', destination: '/editar-propiedad/:path*', permanent: true },
      { source: '/property/:path*', destination: '/propiedad/:path*', permanent: true },
      { source: '/help', destination: '/ayuda', permanent: true },
      { source: '/account', destination: '/cuenta', permanent: true },
      { source: '/login', destination: '/iniciar-sesion', permanent: true },
      { source: '/register', destination: '/registro', permanent: true },
      { source: '/forgot-password', destination: '/recuperar-contrasena', permanent: true },
      { source: '/reset-password', destination: '/restablecer-contrasena', permanent: true },
      { source: '/verify-email', destination: '/verificar-correo', permanent: true },
    ];
  },
  // Disable static page generation for dynamic routes
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  webpack: (config) => {
    // Exclude old src directory from build
    config.module.rules.push({
      test: /\.(js|jsx|ts|tsx)$/,
      exclude: /src\/(pages|components)/,
    });
    return config;
  },
};

module.exports = withPWA(nextConfig);
