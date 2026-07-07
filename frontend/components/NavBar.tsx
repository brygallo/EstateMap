'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  Building2,
  CircleHelp,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

const NavBar = () => {
  const { token, user, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Sesión cerrada exitosamente');
    setMobileMenuOpen(false);
    router.push('/');
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  return (
    <nav className="sticky top-0 z-nav border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
          <div className="flex h-8 w-8 items-center justify-center rounded-card bg-primary text-white">
            <Building2 className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          </div>
          <span className="text-base font-semibold text-textPrimary">
            Geo Propiedades Ecuador
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {token ? (
            <>
              <Button asChild variant="ghost" size="sm" className="text-textSecondary">
                <Link href="/mis-propiedades">
                  <FolderKanban className="h-4 w-4" />
                  Mis Propiedades
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-textSecondary">
                <Link href="/ayuda">
                  <CircleHelp className="h-4 w-4" />
                  Ayuda
                </Link>
              </Button>
              {user?.is_staff && (
                <Button asChild variant="ghost" size="sm" className="text-warning">
                  <Link href="/admin">
                    <ShieldCheck className="h-4 w-4" />
                    Admin
                  </Link>
                </Button>
              )}
              <Button
                asChild
                size="sm"
                className="ml-1 bg-primary text-primary-foreground hover:bg-primaryHover"
              >
                <Link href="/publicar-propiedad">
                  <Plus className="h-4 w-4" />
                  Publicar gratis
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="ml-2 flex items-center gap-2 rounded-card border border-line py-1 pl-1 pr-3 transition-colors hover:bg-background"
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
              <Button asChild variant="ghost" size="sm" className="text-textSecondary">
                <Link href="/ayuda">
                  <CircleHelp className="h-4 w-4" />
                  Ayuda
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-textSecondary">
                <Link href="/iniciar-sesion">Iniciar sesión</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="ml-1 bg-primary text-primary-foreground hover:bg-primaryHover"
              >
                <Link href="/publicar-propiedad">
                  <Plus className="h-4 w-4" />
                  Publicar gratis
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-textPrimary"
              aria-label="Abrir menú"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 sm:w-80">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-left">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                  <Building2 className="h-4 w-4" strokeWidth={2} aria-hidden />
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
                    <Link href="/mis-propiedades">
                      <FolderKanban className="h-4 w-4" />
                      Mis Propiedades
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start" onClick={closeMobileMenu}>
                    <Link href="/publicar-propiedad">
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
                    className="justify-start bg-primary text-primary-foreground hover:bg-primaryHover"
                    onClick={closeMobileMenu}
                  >
                    <Link href="/publicar-propiedad">
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
    </nav>
  );
};

export default NavBar;
