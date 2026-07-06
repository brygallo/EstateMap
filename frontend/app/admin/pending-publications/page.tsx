'use client';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface PendingPublication {
  id: number;
  title: string;
  contact_phone: string;
  contact_email: string;
  city: string;
  province: string;
  property_type: string;
  operation: string;
  price: string;
  source: string;
  status: string;
  draft: any;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  converted: 'Convertido',
  discarded: 'Descartado',
};

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-fuchsia-100 text-fuchsia-700',
  contacted: 'bg-blue-100 text-blue-700',
  converted: 'bg-green-100 text-green-700',
  discarded: 'bg-gray-100 text-gray-600',
};

const SOURCE_LABELS: Record<string, string> = {
  account_required: 'Intento sin cuenta',
  whatsapp_help: 'Ayuda WhatsApp',
  exit_prompt: 'Abandono',
  other: 'Otro',
};

export default function PendingPublicationsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<PendingPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingPublication | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/pending-publications/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar pendientes');
      const json = await res.json();
      setItems(json.results || json || []);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar pendientes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchItems();
  }, [token, fetchItems]);

  const updateStatus = async (item: PendingPublication, status: string) => {
    try {
      const res = await fetch(`${API_URL}/pending-publications/${item.id}/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar');
      toast.success('Estado actualizado');
      fetchItems();
      if (selected?.id === item.id) setSelected({ ...item, status });
    } catch (error: any) {
      toast.error(error.message || 'No se pudo actualizar');
    }
  };

  const whatsappUrl = (item: PendingPublication) => {
    const message = [
      'Hola, te escribimos de Geo Propiedades Ecuador.',
      'Vimos que querías publicar una propiedad y podemos ayudarte a terminarla.',
      '',
      `Propiedad: ${item.title || 'Sin título'}`,
      `Ciudad: ${item.city || 'Sin ciudad'}`,
    ].join('\n');
    return `https://wa.me/${item.contact_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
  };

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100vh-3rem)]">
        <AdminSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Publicaciones Pendientes</h1>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No hay solicitudes pendientes</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Propiedad</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Contacto</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Ciudad</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Origen</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{item.title || `Pendiente #${item.id}`}</p>
                            <p className="text-xs text-gray-500">${item.price || 'Sin precio'}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <p>{item.contact_phone || 'Sin teléfono'}</p>
                            {item.contact_email && <p className="text-xs">{item.contact_email}</p>}
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{item.city || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{SOURCE_LABELS[item.source] || item.source}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[item.status] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABELS[item.status] || item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setSelected(item)} className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Ver</button>
                              {item.contact_phone && (
                                <a href={whatsappUrl(item)} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90">
                                  WhatsApp
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selected.title || `Pendiente #${selected.id}`}</h2>
                <p className="mt-1 text-sm text-gray-500">{new Date(selected.created_at).toLocaleString('es-EC')}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">Cerrar</button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 text-sm">
              <Info label="Teléfono" value={selected.contact_phone || '—'} />
              <Info label="Email" value={selected.contact_email || '—'} />
              <Info label="Ciudad" value={`${selected.city || '—'}${selected.province ? `, ${selected.province}` : ''}`} />
              <Info label="Precio" value={selected.price || '—'} />
              <Info label="Origen" value={SOURCE_LABELS[selected.source] || selected.source} />
              <Info label="Estado" value={STATUS_LABELS[selected.status] || selected.status} />
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-gray-700 mb-2">Borrador</p>
              <pre className="text-xs bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-auto">
                {JSON.stringify(selected.draft || {}, null, 2)}
              </pre>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              {['new', 'contacted', 'converted', 'discarded'].map((status) => (
                <button
                  key={status}
                  onClick={() => updateStatus(selected, status)}
                  className={`px-4 py-2 rounded-xl border text-sm font-semibold ${
                    selected.status === status
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminRoute>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-gray-900">{value}</p>
    </div>
  );
}
