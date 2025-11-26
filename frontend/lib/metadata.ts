import { Metadata } from 'next';

export function generatePageMetadata(
  title: string,
  description: string,
  path: string = '/'
): Metadata {
  const siteName = 'Geo Propiedades Ecuador';
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://estatemap.com';
  const fullUrl = `${baseUrl}${path}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${siteName}`,
      description,
      url: fullUrl,
      siteName,
      locale: 'es_EC',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteName}`,
      description,
    },
    alternates: {
      canonical: fullUrl,
    },
  };
}

// Metadata for specific pages
export const loginMetadata = generatePageMetadata(
  'Iniciar Sesión',
  'Inicia sesión en Geo Propiedades Ecuador para acceder a tu cuenta y gestionar tus propiedades.',
  '/login'
);

export const registerMetadata = generatePageMetadata(
  'Crear Cuenta',
  'Regístrate en Geo Propiedades Ecuador para empezar a publicar y gestionar propiedades en Ecuador.',
  '/register'
);

export const verifyEmailMetadata = generatePageMetadata(
  'Verificar Correo',
  'Verifica tu correo electrónico para activar tu cuenta en Geo Propiedades Ecuador.',
  '/verify-email'
);

export const forgotPasswordMetadata = generatePageMetadata(
  'Recuperar Contraseña',
  'Recupera el acceso a tu cuenta de Geo Propiedades Ecuador mediante tu correo electrónico.',
  '/forgot-password'
);

export const resetPasswordMetadata = generatePageMetadata(
  'Restablecer Contraseña',
  'Restablece tu contraseña para acceder nuevamente a tu cuenta de Geo Propiedades Ecuador.',
  '/reset-password'
);

export const addPropertyMetadata = generatePageMetadata(
  'Publicar Propiedad',
  'Publica tu propiedad en Geo Propiedades Ecuador. Llega a miles de compradores potenciales.',
  '/add-property'
);

export const myPropertiesMetadata = generatePageMetadata(
  'Mis Propiedades',
  'Gestiona todas tus propiedades publicadas en Geo Propiedades Ecuador desde un solo lugar.',
  '/my-properties'
);
