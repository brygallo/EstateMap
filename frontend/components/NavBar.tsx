'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Suspense, useState } from 'react';
import {
  CircleHelp,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  Plus,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { trackEvent } from '@/lib/analytics';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import NavigationProgress from '@/components/NavigationProgress';

const NavBar = () => {
  const { token, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada exitosamente');
    setMobileMenuOpen(false);
    router.push('/');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const trackPublishClick = (source: string) => {
    trackEvent('publish_cta_clicked', { source, authenticated: Boolean(token) });
  };

  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();
  const navLinkClass = (href: string) =>
    `aents-nav-link ${pathname === href || (href !== '/' && pathname?.startsWith(href + '/')) ? 'is-active' : ''}`;

  return (
    <nav className="aents-site-header fixed inset-x-0 top-0 z-nav h-[var(--app-header-height)]">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <div className="aents-header-grid" aria-hidden />
      <div className="aents-header-aura" aria-hidden />
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3" onClick={closeMobileMenu}>
          <div className="aents-brand-mark flex h-10 w-10 items-center justify-center rounded-[12px]">
            <Image src="/aents/aents-symbol.png" alt="" width={30} height={30} className="h-[30px] w-[30px]" priority />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-base font-semibold leading-tight text-textPrimary">
              Geo Propiedades
            </span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-textSecondary">
              Ecuador
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {token ? (
            <>
              <Link href="/propiedades" className={navLinkClass('/propiedades')}>
                <MapPinned className="h-4 w-4" />
                Explorar
              </Link>
              <Link href="/mis-propiedades" className={navLinkClass('/mis-propiedades')}>
                <FolderKanban className="h-4 w-4" />
                Mis propiedades
              </Link>
              <Link href="/ayuda" className={navLinkClass('/ayuda')}>
                <CircleHelp className="h-4 w-4" />
                Ayuda
              </Link>
              {user?.is_staff && (
                <Link href="/admin" className={`${navLinkClass('/admin')} text-warning hover:text-warning`}>
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </Link>
              )}
              <Button
                asChild
                size="sm"
                className="aents-header-cta ml-2 h-9 rounded-full px-4 font-semibold text-white"
              >
                <Link href="/publicar-propiedad" onClick={() => trackPublishClick('navbar_desktop_auth')}>
                  <Plus className="h-4 w-4" />
                  Publicar gratis
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="ml-2 flex h-9 items-center gap-2 rounded-full border border-line bg-white/80 py-1 pl-1 pr-3 text-textPrimary shadow-card backdrop-blur-md transition-colors hover:bg-white"
                    aria-label="Menú de usuario"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primaryLight text-xs font-semibold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[120px] truncate text-sm font-medium text-textPrimary">
                      {user?.username || 'Cuenta'}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/cuenta" className="cursor-pointer">
                      <UserIcon className="h-4 w-4" />
                      Mi cuenta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-error focus:text-error">
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/propiedades" className={navLinkClass('/propiedades')}>
                <MapPinned className="h-4 w-4" />
                Explorar
              </Link>
              <Link href="/ayuda" className={navLinkClass('/ayuda')}>
                <CircleHelp className="h-4 w-4" />
                Ayuda
              </Link>
              <Link href="/iniciar-sesion" className={navLinkClass('/iniciar-sesion')}>
                Iniciar sesión
              </Link>
              <Button
                asChild
                size="sm"
                className="aents-header-cta ml-2 h-9 rounded-full px-4 font-semibold text-white"
              >
                <Link href="/publicar-propiedad" onClick={() => trackPublishClick('navbar_desktop_guest')}>
                  <Plus className="h-4 w-4" />
                  Publicar gratis
                </Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/publicar-propiedad"
            className="mobile-publish-cta aents-header-cta inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-white"
            onClick={() => {
              trackPublishClick('navbar_mobile_pill');
              closeMobileMenu();
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            Publicar gratis
          </Link>

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-textPrimary hover:bg-primaryLight hover:text-primary md:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 border-line bg-surface sm:w-80">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-left">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary text-white">
                  <Image src="/aents/aents-symbol.png" alt="" width={24} height={24} className="h-6 w-6" />
                </div>
                Geo Propiedades
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 flex flex-col gap-1">
              {token ? (
                <>
                  <div className="mb-2 flex items-center gap-3 rounded-lg bg-background px-3 py-2.5">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primaryLight text-sm font-semibold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-semibold text-textPrimary">
                      {user?.username || 'Cuenta'}
                    </span>
                  </div>

                  <Button asChild variant="ghost" className="justify-start" onClick={closeMobileMenu}>
                    <Link href="/propiedades">
                      <MapPinned className="h-4 w-4" />
                      Explorar propiedades
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start" onClick={closeMobileMenu}>
                    <Link href="/mis-propiedades">
                      <FolderKanban className="h-4 w-4" />
                      Mis Propiedades
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start" onClick={closeMobileMenu}>
                    <Link href="/publicar-propiedad" onClick={() => trackPublishClick('navbar_mobile_auth_menu')}>
                      <Plus className="h-4 w-4" />
                      Nueva Propiedad
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start" onClick={closeMobileMenu}>
                    <Link href="/cuenta">
                      <UserIcon className="h-4 w-4" />
                      Mi cuenta
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start" onClick={closeMobileMenu}>
                    <Link href="/ayuda">
                      <CircleHelp className="h-4 w-4" />
                      Ayuda
                    </Link>
                  </Button>
                  {user?.is_staff && (
                    <Button asChild variant="ghost" className="justify-start text-warning" onClick={closeMobileMenu}>
                      <Link href="/admin">
                        <LayoutDashboard className="h-4 w-4" />
                        Panel Admin
                      </Link>
                    </Button>
                  )}

                  <Separator className="my-2" />

                  <Button
                    variant="outline"
                    className="justify-start text-error hover:text-error"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" className="justify-start" onClick={closeMobileMenu}>
                    <Link href="/propiedades">
                      <MapPinned className="h-4 w-4" />
                      Explorar propiedades
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start" onClick={closeMobileMenu}>
                    <Link href="/iniciar-sesion">
                      <UserIcon className="h-4 w-4" />
                      Iniciar sesión
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start" onClick={closeMobileMenu}>
                    <Link href="/ayuda">
                      <CircleHelp className="h-4 w-4" />
                      Ayuda
                    </Link>
                  </Button>

                  <Separator className="my-2" />

                  <Button
                    asChild
                    className="justify-start rounded-full bg-primary text-primary-foreground hover:bg-primaryHover"
                    onClick={closeMobileMenu}
                  >
                    <Link href="/publicar-propiedad" onClick={() => trackPublishClick('navbar_mobile_guest_menu')}>
                      <Plus className="h-4 w-4" />
                      Publicar gratis
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>
      <style jsx>{`
        @keyframes mobilePublishPulse {
          0%, 100% {
            transform: translateY(0) scale(1);
            box-shadow: 0 8px 18px rgb(var(--accent-alt-strong-rgb) / 0.18);
          }
          45% {
            transform: translateY(-1px) scale(1.025);
            box-shadow: 0 10px 22px rgb(var(--accent-alt-strong-rgb) / 0.26);
          }
        }
        .mobile-publish-cta {
          animation: mobilePublishPulse 2.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .mobile-publish-cta {
            animation: none;
          }
        }
      `}</style>
    </nav>
  );
};

export default NavBar;
