import Link from 'next/link';
import { MessageCircle, MapPin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const whatsappHref =
  'https://wa.me/593983738151?text=Hola%20necesito%20ayuda%20con%20Geo%20Propiedades';

const EXPLORE_LINKS = [
  { href: '/casas-en-venta', label: 'Casas en venta' },
  { href: '/departamentos-en-alquiler', label: 'Departamentos en alquiler' },
  { href: '/terrenos-en-venta', label: 'Terrenos en venta' },
  { href: '/locales-comerciales', label: 'Locales comerciales' },
];

const PLATFORM_LINKS = [
  { href: '/', label: 'Mapa interactivo' },
  { href: '/add-property', label: 'Publicar propiedad' },
  { href: '/help', label: 'Centro de ayuda' },
];

const Footer = () => (
  <footer className="bg-surface">
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {/* Marca */}
        <div className="sm:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <MapPin className="h-4 w-4" strokeWidth={2} aria-hidden />
            </div>
            <span className="text-base font-bold text-textPrimary">Geo Propiedades Ecuador</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-textSecondary">
            Encuentra casas, departamentos, terrenos y locales en el mapa. Publica gratis
            y llega a compradores en todo Ecuador.
          </p>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-button bg-background px-4 py-2 text-sm font-medium text-textPrimary transition-colors hover:bg-primaryLight hover:text-primary"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
            Escríbenos por WhatsApp
          </a>
        </div>

        {/* Explorar */}
        <nav aria-label="Explorar propiedades">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
            Explorar
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {EXPLORE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-textSecondary transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Plataforma */}
        <nav aria-label="Plataforma">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
            Plataforma
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {PLATFORM_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-textSecondary transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <Separator className="my-10" />

      <p className="text-center text-xs text-textSecondary sm:text-left">
        © {new Date().getFullYear()} Geo Propiedades Ecuador. Todos los derechos reservados.
      </p>
    </div>
  </footer>
);

export default Footer;
