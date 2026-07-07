'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  ShieldCheck,
  ArrowLeft,
  Menu,
  X,
  DownloadCloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/properties', label: 'Propiedades', icon: Building2 },
  { href: '/admin/pending-publications', label: 'Pendientes', icon: Clock },
  { href: '/admin/ingesta', label: 'Importar', icon: DownloadCloud },
];

const AdminSidebar = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const NavContent = () => (
    <div className="flex h-full flex-col p-4">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-button bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-textPrimary">Panel Admin</p>
          <p className="text-xs text-textSecondary">Geo Propiedades</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-button px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-card'
                  : 'text-textSecondary hover:bg-muted hover:text-textPrimary'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line pt-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-button px-3 py-2.5 text-sm font-medium text-textSecondary transition-colors hover:bg-muted hover:text-textPrimary"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          <span>Volver al sitio</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-cardHover transition-colors hover:bg-primaryHover lg:hidden"
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile overlay */}
      <div
        onClick={() => setMobileOpen(false)}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed left-0 top-12 z-40 h-[calc(100vh-3rem)] w-64 border-r border-line bg-surface shadow-card transition-transform duration-200 ease-in-out',
          'lg:sticky lg:z-0 lg:translate-x-0 lg:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent />
      </aside>
    </>
  );
};

export default AdminSidebar;
