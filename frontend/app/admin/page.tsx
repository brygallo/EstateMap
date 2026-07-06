'use client';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface DashboardData {
  total_users: number;
  total_properties: number;
  properties_for_sale: number;
  properties_for_rent: number;
  properties_inactive: number;
  properties_active: number;
  total_views: number;
  total_leads: number;
  leads_new: number;
  pending_publications: number;
  pending_publications_new: number;
  new_users_30d: number;
  properties_without_images: number;
  properties_incomplete: number;
  recent_users: any[];
  recent_properties: any[];
  recent_leads: any[];
}

const AdminDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/dashboard/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Error al cargar datos');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchDashboard();
  }, [token]);

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100vh-3rem)]">
        <AdminSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

            {loading && (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
            )}

            {data && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                  <StatCard label="Usuarios" value={data.total_users} color="bg-blue-500" icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
                  } />
                  <StatCard label="Propiedades" value={data.total_properties} color="bg-indigo-500" icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  } />
                  <StatCard label="En venta" value={data.properties_for_sale} color="bg-green-500" icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  } />
                  <StatCard label="En alquiler" value={data.properties_for_rent} color="bg-yellow-500" icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                  } />
                  <StatCard label="Inactivas" value={data.properties_inactive} color="bg-gray-500" icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  } />
                </div>

                {/* Panel comercial */}
                <h2 className="text-lg font-bold text-gray-900 mb-3">Panel comercial</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <StatCard label="Activas" value={data.properties_active} color="bg-emerald-500" icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  } />
                  <StatCard label="Vistas totales" value={data.total_views} color="bg-sky-500" icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  } />
                  <StatCard label="Contactos" value={data.total_leads} color="bg-violet-500" icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  } />
                  <StatCard label="Contactos nuevos" value={data.leads_new} color="bg-rose-500" icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  } />
                  <StatCard label="Pendientes" value={data.pending_publications_new} color="bg-fuchsia-500" icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  } />
                  <StatCard label="Nuevos usuarios (30d)" value={data.new_users_30d} color="bg-blue-500" icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  } />
                  <StatCard label="Sin imágenes" value={data.properties_without_images} color="bg-amber-500" icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  } />
                  <StatCard label="Incompletas" value={data.properties_incomplete} color="bg-orange-500" icon={
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  } />
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <Link href="/admin/users" className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="p-2 bg-blue-100 rounded-lg mr-4">
                      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Gestionar Usuarios</h3>
                      <p className="text-sm text-gray-500">Ver, activar/desactivar y administrar usuarios</p>
                    </div>
                  </Link>
                  <Link href="/admin/properties" className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="p-2 bg-indigo-100 rounded-lg mr-4">
                      <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Gestionar Propiedades</h3>
                      <p className="text-sm text-gray-500">Ver todas las propiedades y moderar contenido</p>
                    </div>
                  </Link>
                  <Link href="/admin/pending-publications" className="flex items-center p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="p-2 bg-fuchsia-100 rounded-lg mr-4">
                      <svg className="h-6 w-6 text-fuchsia-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Publicaciones Pendientes</h3>
                      <p className="text-sm text-gray-500">Contactar interesados que no terminaron el registro</p>
                    </div>
                  </Link>
                </div>

                {/* Recent Users */}
                <div className="bg-white rounded-lg border border-gray-200 mb-6">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900">Usuarios Recientes</h2>
                    <Link href="/admin/users" className="text-sm text-primary hover:underline">Ver todos</Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Usuario</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Email</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Registro</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.recent_users.map((u: any) => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center space-x-2">
                                <div className="h-8 w-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                                  {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                                </div>
                                <span className="font-medium text-gray-900">
                                  {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-gray-600">{u.email}</td>
                            <td className="px-4 py-2.5 text-gray-600">{new Date(u.date_joined).toLocaleDateString('es-EC')}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {u.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Properties */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900">Propiedades Recientes</h2>
                    <Link href="/admin/properties" className="text-sm text-primary hover:underline">Ver todas</Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Título</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Tipo</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Estado</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Precio</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Propietario</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.recent_properties.map((p: any) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-900">{p.title || `Propiedad #${p.id}`}</td>
                            <td className="px-4 py-2.5 text-gray-600 capitalize">{typeLabel(p.property_type)}</td>
                            <td className="px-4 py-2.5">
                              <StatusBadge status={p.status} />
                            </td>
                            <td className="px-4 py-2.5 text-gray-600">${Number(p.price).toLocaleString('es-EC')}</td>
                            <td className="px-4 py-2.5 text-gray-600">{p.owner_username || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Contactos recientes (leads) */}
                <div className="bg-white rounded-lg border border-gray-200 mt-6">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900">Contactos Recientes</h2>
                    <span className="text-sm text-gray-500">{data.total_leads} en total</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Nombre</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Teléfono</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Propiedad</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Origen</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.recent_leads.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                              Aún no hay contactos registrados
                            </td>
                          </tr>
                        ) : (
                          data.recent_leads.map((l: any) => (
                            <tr key={l.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-medium text-gray-900">{l.name}</td>
                              <td className="px-4 py-2.5 text-gray-600">{l.phone}</td>
                              <td className="px-4 py-2.5 text-gray-600">{l.property_title || `#${l.property}`}</td>
                              <td className="px-4 py-2.5 text-gray-600">{leadSourceLabel(l.source)}</td>
                              <td className="px-4 py-2.5">
                                <LeadStatusBadge status={l.status} />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </AdminRoute>
  );
};

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg text-white ${color}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    for_sale: 'bg-green-100 text-green-700',
    for_rent: 'bg-yellow-100 text-yellow-700',
    inactive: 'bg-gray-100 text-gray-600',
  };
  const labels: Record<string, string> = {
    for_sale: 'En venta',
    for_rent: 'En alquiler',
    inactive: 'Inactiva',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}

function LeadStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: 'bg-rose-100 text-rose-700',
    contacted: 'bg-blue-100 text-blue-700',
    closed: 'bg-gray-100 text-gray-600',
  };
  const labels: Record<string, string> = {
    new: 'Nuevo',
    contacted: 'Contactado',
    closed: 'Cerrado',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}

function leadSourceLabel(s: string) {
  const map: Record<string, string> = {
    property_modal: 'Modal del mapa',
    property_page: 'Página',
    whatsapp: 'WhatsApp',
    phone: 'Teléfono',
    other: 'Otro',
  };
  return map[s] || s;
}

function typeLabel(t: string) {
  const map: Record<string, string> = {
    house: 'Casa',
    land: 'Terreno',
    apartment: 'Departamento',
    commercial: 'Comercial',
    other: 'Otro',
  };
  return map[t] || t;
}

export default AdminDashboard;
