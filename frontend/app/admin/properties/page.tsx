'use client';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface PropertyItem {
  id: number;
  title: string;
  property_type: string;
  status: string;
  price: string;
  city: string;
  province: string;
  owner: number | null;
  owner_username: string | null;
  owner_email: string | null;
  created_at: string;
}

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'for_sale', label: 'En venta' },
  { key: 'for_rent', label: 'En alquiler' },
  { key: 'inactive', label: 'Inactivas' },
];

const TYPE_LABELS: Record<string, string> = {
  house: 'Casa',
  land: 'Terreno',
  apartment: 'Departamento',
  commercial: 'Comercial',
  other: 'Otro',
};

const STATUS_STYLES: Record<string, string> = {
  for_sale: 'bg-green-100 text-green-700',
  for_rent: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  for_sale: 'En venta',
  for_rent: 'En alquiler',
  inactive: 'Inactiva',
};

const AdminPropertiesPage = () => {
  const { token } = useAuth();
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState<PropertyItem | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));

      const res = await fetch(`${API_URL}/admin/properties/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar propiedades');
      const json = await res.json();

      if (json.results) {
        setProperties(json.results);
        setTotalPages(Math.ceil(json.count / (json.results.length || 10)) || 1);
      } else {
        setProperties(Array.isArray(json) ? json : []);
        setTotalPages(1);
      }
    } catch {
      toast.error('Error al cargar propiedades');
    } finally {
      setLoading(false);
    }
  }, [token, search, page]);

  useEffect(() => {
    if (token) fetchProperties();
  }, [token, fetchProperties]);

  const filteredProperties = properties.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const handleDelete = async (prop: PropertyItem) => {
    try {
      const res = await fetch(`${API_URL}/admin/properties/${prop.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Propiedad eliminada');
      fetchProperties();
    } catch (err: any) {
      toast.error(err.message);
    }
    setConfirmDelete(null);
  };

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100vh-3rem)]">
        <AdminSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestión de Propiedades</h1>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por título o propietario..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      filter === f.key
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No se encontraron propiedades</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Título</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Tipo</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Precio</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Propietario</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Ciudad</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 hidden xl:table-cell">Fecha</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProperties.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 truncate max-w-[200px]">{p.title || `Propiedad #${p.id}`}</p>
                            <p className="text-xs text-gray-500 sm:hidden">{TYPE_LABELS[p.property_type] || p.property_type}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden sm:table-cell capitalize">{TYPE_LABELS[p.property_type] || p.property_type}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLES[p.status] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABELS[p.status] || p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden md:table-cell">${Number(p.price).toLocaleString('es-EC')}</td>
                          <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{p.owner_username || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{p.city || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 hidden xl:table-cell">{new Date(p.created_at).toLocaleDateString('es-EC')}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end space-x-1">
                              <Link
                                href={`/property/${p.id}`}
                                target="_blank"
                                title="Ver propiedad"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </Link>
                              <button
                                onClick={() => setConfirmDelete(p)}
                                title="Eliminar"
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-200">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {confirmDelete && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Eliminar propiedad</h3>
                <p className="text-gray-600 mb-6">
                  ¿Estás seguro de eliminar <strong>{confirmDelete.title || `Propiedad #${confirmDelete.id}`}</strong>? Esta acción no se puede deshacer.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDelete(confirmDelete)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AdminRoute>
  );
};

export default AdminPropertiesPage;
