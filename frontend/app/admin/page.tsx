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
  recent_users: any[];
  recent_properties: any[];
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
