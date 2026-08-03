import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Mail, MapPin, MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/constants';

const whatsappHref = buildWhatsAppUrl('Hola necesito ayuda con Geo Propiedades');

type IconProps = { className?: string };

const FacebookIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
  </svg>
);

const InstagramIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const WhatsappIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm5.8 14.16c-.24.68-1.4 1.3-1.94 1.35-.5.05-.98.24-3.3-.7-2.79-1.13-4.55-3.97-4.69-4.16-.14-.19-1.13-1.51-1.13-2.88 0-1.37.72-2.04.98-2.32.24-.28.53-.35.71-.35.18 0 .35 0 .51.01.16.01.38-.06.6.46.24.56.79 1.93.86 2.07.07.14.12.3.02.49-.1.19-.15.3-.29.47-.14.16-.3.37-.43.5-.14.14-.28.29-.12.57.16.28.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.69-.8.87-1.08.18-.28.36-.23.6-.14.24.09 1.55.73 1.82.86.28.14.46.21.53.32.07.11.07.65-.17 1.33Z" />
  </svg>
);

const EXPLORE_LINKS = [
  { href: '/casas-en-venta', label: 'Casas en venta' },
  { href: '/departamentos-en-alquiler', label: 'Departamentos en alquiler' },
  { href: '/terrenos-en-venta', label: 'Terrenos en venta' },
  { href: '/locales-comerciales', label: 'Locales comerciales' },
];

const PLATFORM_LINKS = [
  { href: '/', label: 'Mapa interactivo' },
  { href: '/propiedades', label: 'Propiedades en Ecuador' },
  { href: '/estadisticas-inmobiliarias', label: 'Estadísticas del mercado' },
  { href: '/publicar-propiedad', label: 'Publicar propiedad' },
  { href: '/inmobiliarias', label: 'Inmobiliarias' },
  { href: '/guias', label: 'Guías inmobiliarias' },
  { href: '/ayuda', label: 'Centro de ayuda' },
];

const SOCIAL_LINKS = [
  { href: 'https://www.facebook.com', label: 'Facebook', icon: FacebookIcon },
  { href: 'https://www.instagram.com', label: 'Instagram', icon: InstagramIcon },
  { href: whatsappHref, label: 'WhatsApp', icon: WhatsappIcon },
];

// Column headings borrow the header's sublabel treatment — same size and
// tracking — recoloured to lavender for the navy surface.
const headingClass = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lavender)]';
const mutedClass = 'text-xs text-white/60';
const contactIconClass = 'h-4 w-4 flex-shrink-0 text-[var(--lavender)]';

const FooterLink = ({ href, label }: { href: string; label: string }) => (
  <li>
    <Link href={href} className="aents-footer-link">
      {label}
    </Link>
  </li>
);

const LinkColumn = ({
  title,
  links,
  className,
}: {
  title: string;
  links: { href: string; label: string }[];
  className?: string;
}) => (
  <nav aria-label={title} className={className}>
    <h2 className={headingClass}>{title}</h2>
    <ul className="mt-5 space-y-3.5">
      {links.map((link) => (
        <FooterLink key={link.href} {...link} />
      ))}
    </ul>
  </nav>
);

const Footer = () => (
  <footer className="aents-site-footer relative overflow-hidden">
    <div className="aents-footer-grid" aria-hidden />
    <div className="aents-footer-glow" aria-hidden />

    <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        {/* Marca */}
        <div className="lg:col-span-5">
          {/*
            Aents is the primary mark in this footer and the product signs
            underneath it. This is <AentsLogo size={88} tone="negative" tagline />
            from @aents/ui-web, the exact call apps/web makes in its own footer:
            the brand tile plus live type, not a flattened lockup image. The
            wordmark and tagline sizes come from .aents-site-footer__brand.
          */}
          <div className="aents-footer-brand aents-site-footer__brand">
            <a
              href="https://aents.net"
              target="_blank"
              rel="noreferrer"
              className="logo-lockup transition-opacity duration-200 hover:opacity-80"
              aria-label="Aents — Software for people"
            >
              <Image
                src="/aents/aents-brand-tile-1024.png"
                alt=""
                width={88}
                height={88}
                className="aents-brand-symbol h-[88px] w-[88px]"
                aria-hidden
              />
              <span className="logo-text">
                <span className="logo-wordmark">Aents</span>
                <span className="logo-tagline">Software for people.</span>
              </span>
            </a>
          </div>

          <p className="aents-footer-origin">
            <span className="aents-footer-origin-dot" aria-hidden />
            Geo Propiedades Ecuador, un producto digital del ecosistema Aents.
          </p>

          <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/75">
            Encuentra casas, departamentos, terrenos y locales directamente en el mapa.
            Publica gratis y llega a compradores en todo Ecuador.
          </p>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="aents-footer-action mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Escríbenos por WhatsApp
          </a>

          {/* Redes sociales */}
          <div className="mt-8 flex items-center gap-3">
            {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="aents-footer-social flex h-10 w-10 items-center justify-center rounded-full"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        {/* Enlaces */}
        <div className="aents-footer-columns grid gap-10 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-3 lg:gap-8">
          <LinkColumn title="Explorar" links={EXPLORE_LINKS} />
          <LinkColumn title="Plataforma" links={PLATFORM_LINKS} />

          {/* Contacto */}
          <div>
            <h2 className={headingClass}>Contacto</h2>
            <ul className="mt-5 space-y-3.5 text-sm text-white/70">
              <li>
                <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 transition-colors hover:text-white">
                  <MessageCircle className={contactIconClass} strokeWidth={2} aria-hidden />
                  +593 98 373 8151
                </a>
              </li>
              <li>
                <a href="mailto:soporte@geopropiedades.ec" className="inline-flex items-center gap-2 transition-colors hover:text-white">
                  <Mail className={contactIconClass} strokeWidth={2} aria-hidden />
                  Soporte
                </a>
              </li>
              <li className="inline-flex items-center gap-2">
                <MapPin className={contactIconClass} strokeWidth={2} aria-hidden />
                Ecuador
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="mt-14 border-t border-white/[0.12] pt-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className={mutedClass}>
            © {new Date().getFullYear()} Geo Propiedades Ecuador, un producto de{' '}
            <a
              href="https://aents.net"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-white/80 underline-offset-2 transition-colors hover:text-white hover:underline"
            >
              Aents
            </a>
            . Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <span className="aents-footer-signal" aria-hidden>
              <i />
              <i />
              <b />
            </span>
            <Link href="/ayuda" className={`group inline-flex items-center gap-1 ${mutedClass} transition-colors hover:text-white`}>
              Ayuda
              <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </Link>
            <span className={mutedClass}>Hecho en Ecuador 🇪🇨</span>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
