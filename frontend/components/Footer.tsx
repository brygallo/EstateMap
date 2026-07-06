import Link from 'next/link';
import { MessageCircle, MapPin } from 'lucide-react';

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
  <footer className="bg-dark text-textSecondary">
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
      {/* Marca */}
      <div className="sm:col-span-2 lg:col-span-2">
        <div className="flex items-center gap-2 text-white">
          <MapPin className="h-5 w-5 text-secondary" strokeWidth={2} aria-hidden />
          <span className="text-base font-semibold">Geo Propiedades Ecuador</span>
        </div>
        <p className="mt-3 max-w-sm text-sm leading-relaxed">
          Encuentra casas, departamentos, terrenos y locales en el mapa. Publica gratis
          y llega a compradores en todo Ecuador.
        </p>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
          Escríbenos por WhatsApp
        </a>
      </div>

      {/* Explorar */}
      <nav aria-label="Explorar propiedades">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/70">
          Explorar
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {EXPLORE_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="transition-colors hover:text-white">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Plataforma */}
      <nav aria-label="Plataforma">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/70">
          Plataforma
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {PLATFORM_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="transition-colors hover:text-white">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>

    <div className="border-t border-white/10">
      <p className="mx-auto max-w-6xl px-4 py-4 text-center text-xs sm:text-left">
        © {new Date().getFullYear()} Geo Propiedades Ecuador. Todos los derechos reservados.
      </p>
    </div>
  </footer>
);

export default Footer;
