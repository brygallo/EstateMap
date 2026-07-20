'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ExternalLink, MousePointerClick, RefreshCw } from 'lucide-react';
import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010/api';
type EventItem = { id: number; user_label: string; event_name: string; property: number | null; property_title: string | null; path: string; payload: Record<string, unknown>; created_at: string };

export default function AdminActivityPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<EventItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [contactsOnly, setContactsOnly] = useState(true);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const query = contactsOnly ? '?event_name=property_contact_clicked' : '';
    try {
      const response = await fetch(`${API_URL}/activity-events/${query}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setItems(Array.isArray(data) ? data : data.results || []);
      setCount(Array.isArray(data) ? data.length : data.count || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token, contactsOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  return <AdminRoute><div className="flex min-h-[calc(100vh-3rem)] bg-background"><AdminSidebar /><main className="min-w-0 flex-1 overflow-auto"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold text-textPrimary">Actividad y clics</h1><p className="mt-1 text-sm text-textSecondary">Auditoría de contactos, publicaciones y navegación relevante.</p></div><Button variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Actualizar</Button></div>
    <div className="mb-5 grid gap-3 sm:grid-cols-2"><Card className="p-4"><MousePointerClick className="h-5 w-5 text-primary" /><p className="mt-2 text-2xl font-black text-textPrimary">{count}</p><p className="text-sm text-textSecondary">{contactsOnly ? 'Clics de contacto registrados' : 'Eventos registrados'}</p></Card><Card className="flex items-center justify-between gap-3 p-4"><div><p className="font-semibold text-textPrimary">Vista actual</p><p className="text-sm text-textSecondary">{contactsOnly ? 'Solo contactos' : 'Toda la actividad'}</p></div><Button size="sm" onClick={() => setContactsOnly((value) => !value)}>{contactsOnly ? 'Ver todo' : 'Solo contactos'}</Button></Card></div>
    <Card className="overflow-hidden"><div className="grid grid-cols-[1fr_auto] border-b border-line bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-textSecondary sm:grid-cols-[1.1fr_1.2fr_0.8fr_auto]"><span>Actividad</span><span className="hidden sm:block">Propiedad</span><span className="hidden sm:block">Usuario</span><span>Fecha</span></div>
      {loading ? <div className="space-y-2 p-4">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-14" />)}</div> : items.length ? items.map((event) => <div key={event.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-[1.1fr_1.2fr_0.8fr_auto]"><div className="min-w-0"><p className="truncate text-sm font-medium text-textPrimary">{event.event_name === 'property_contact_clicked' ? `Contacto · ${String(event.payload.method || 'clic')}` : event.event_name}</p><p className="truncate text-xs text-textSecondary">{String(event.payload.source || event.path || '')}</p></div><div className="hidden min-w-0 sm:block">{event.property ? <Link href={`/propiedad/${event.property}`} className="inline-flex max-w-full items-center gap-1 truncate text-sm text-primary">#{event.property} {event.property_title || ''}<ExternalLink className="h-3 w-3 shrink-0" /></Link> : <span className="text-sm text-textSecondary">—</span>}</div><span className="hidden truncate text-sm text-textSecondary sm:block">{event.user_label}</span><span className="whitespace-nowrap text-xs text-textSecondary">{new Date(event.created_at).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}</span></div>) : <div className="p-10 text-center text-sm text-textSecondary"><Activity className="mx-auto mb-2 h-7 w-7" />Todavía no hay eventos registrados.</div>}
    </Card>
  </div></main></div></AdminRoute>;
}
