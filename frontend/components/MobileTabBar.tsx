'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, FolderKanban, MapPinned, Plus, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { trackEvent } from '@/lib/analytics';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

/**
 * Bottom tab bar for phones.
 *
 * Everything a visitor might navigate to lived behind the hamburger, which
 * costs two taps and hides the product's own shape. A tab bar is the native
 * pattern for the handful of destinations a person returns to, and on a phone
 * it sits where the thumb already rests — the top-right hamburger is the
 * hardest corner of a large screen to reach.
 *
 * Five items is the ceiling; past that the labels stop being legible and the
 * targets drop under 44px.
 */

const TABS_GUEST = [
  { href: '/', label: 'Mapa', icon: MapPinned },
  { href: '/estadisticas-inmobiliarias', label: 'Precios', icon: BarChart3 },
  { href: '/publicar-propiedad', label: 'Publicar', icon: Plus, primary: true },
  { href: '/iniciar-sesion', label: 'Entrar', icon: UserIcon },
];

const TABS_AUTH = [
  { href: '/', label: 'Mapa', icon: MapPinned },
  { href: '/estadisticas-inmobiliarias', label: 'Precios', icon: BarChart3 },
  { href: '/publicar-propiedad', label: 'Publicar', icon: Plus, primary: true },
  { href: '/mis-propiedades', label: 'Mis avisos', icon: FolderKanban },
  { href: '/cuenta', label: 'Cuenta', icon: UserIcon },
];

/**
 * Routes that own the full height of the screen and would be broken by a bar
 * pinned over them. The map page in particular already has its own drawer and
 * floating result count occupying that exact strip.
 */
const HIDDEN_ON = [/^\/admin(\/|$)/, /^\/publicar-asistido(\/|$)/, /^\/(iniciar-sesion|registro|recuperar-contrasena)(\/|$)/];

export default function MobileTabBar() {
  const pathname = usePathname();
  const { token } = useAuth();

  if (HIDDEN_ON.some((pattern) => pattern.test(pathname || ''))) return null;

  const tabs = token ? TABS_AUTH : TABS_GUEST;
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-nav border-t border-line bg-white/95 backdrop-blur md:hidden"
      // Sits above the iOS home indicator and the Android gesture bar rather
      // than under them.
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegación principal"
    >
      <ul className="flex items-stretch">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  haptic('selection');
                  if (tab.href === '/publicar-propiedad') {
                    trackEvent('publish_cta_clicked', { source: 'mobile_tab_bar', authenticated: Boolean(token) });
                  }
                }}
                // A fixed h-14 rather than a min-height: `--mobile-tabbar-height`
                // is what every other bottom-anchored element offsets by, so
                // the bar's real height has to be exactly what the token says,
                // not whatever the labels round up to.
                className={cn(
                  'flex h-14 touch-manipulation flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium leading-none transition-colors',
                  active ? 'text-primary' : 'text-textSecondary active:text-textPrimary'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    active && 'bg-primaryLight',
                    // Publishing is the one action the business needs; give it
                    // the filled treatment so it reads as the primary tab even
                    // when another one is active.
                    'primary' in tab && tab.primary && !active && 'bg-primary text-white'
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
