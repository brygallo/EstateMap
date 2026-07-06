'use client';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface UserItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_email_verified: boolean;
  date_joined: string;
  avatar_url: string | null;
  properties_count: number;
}

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'inactive', label: 'Inactivos' },
  { key: 'staff', label: 'Staff' },
];

const AdminUsersPage = () => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState<{ type: string; user: UserItem } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));

      const res = await fetch(`${API_URL}/admin/users/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const json = await res.json();

      // Handle paginated or non-paginated response
      if (json.results) {
        setUsers(json.results);
        setTotalPages(Math.ceil(json.count / (json.results.length || 10)) || 1);
      } else {
        setUsers(Array.isArray(json) ? json : []);
        setTotalPages(1);
      }
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [token, search, page]);

  useEffect(() => {
    if (token) fetchUsers();
  }, [token, fetchUsers]);

  const filteredUsers = users.filter((u) => {
    if (filter === 'active') return u.is_active;
    if (filter === 'inactive') return !u.is_active;
    if (filter === 'staff') return u.is_staff;
    return true;
  });

  const handleToggleActive = async (user: UserItem) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${user.id}/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error');
      }
      toast.success(`Usuario ${!user.is_active ? 'activado' : 'desactivado'}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
    setConfirmAction(null);
  };

  const handleToggleStaff = async (user: UserItem) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${user.id}/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_staff: !user.is_staff }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error');
      }
      toast.success(`Rol admin ${!user.is_staff ? 'otorgado' : 'revocado'}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
    setConfirmAction(null);
  };

  const handleDeleteUser = async (user: UserItem) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${user.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error');
      }
      toast.success('Usuario eliminado');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
    setConfirmAction(null);
  };

  const isSelf = (u: UserItem) => String(u.id) === String(currentUser?.id);

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100vh-3rem)]">
        <AdminSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestión de Usuarios</h1>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
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
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No se encontraron usuarios</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Email</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Registro</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Rol</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Props.</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <div className="h-8 w-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                                </p>
                                <p className="text-xs text-gray-500 sm:hidden truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{u.email}</td>
                          <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{new Date(u.date_joined).toLocaleDateString('es-EC')}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {u.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {u.is_staff ? (
                              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">Admin</span>
                            ) : (
                              <span className="text-gray-500 text-xs">Usuario</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{u.properties_count}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end space-x-1">
                              {/* Toggle Active */}
                              <button
                                onClick={() => setConfirmAction({ type: 'toggle_active', user: u })}
                                disabled={isSelf(u)}
                                title={u.is_active ? 'Desactivar' : 'Activar'}
                                className={`p-1.5 rounded-lg transition-colors ${isSelf(u) ? 'text-gray-300 cursor-not-allowed' : u.is_active ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                              >
                                {u.is_active ? (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                ) : (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                )}
                              </button>
                              {/* Toggle Staff */}
                              <button
                                onClick={() => setConfirmAction({ type: 'toggle_staff', user: u })}
                                disabled={isSelf(u)}
                                title={u.is_staff ? 'Revocar admin' : 'Otorgar admin'}
                                className={`p-1.5 rounded-lg transition-colors ${isSelf(u) ? 'text-gray-300 cursor-not-allowed' : u.is_staff ? 'text-purple-600 hover:bg-purple-50' : 'text-gray-400 hover:bg-gray-100'}`}
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                              </button>
                              {/* Delete */}
                              <button
                                onClick={() => setConfirmAction({ type: 'delete', user: u })}
                                disabled={isSelf(u)}
                                title="Eliminar"
                                className={`p-1.5 rounded-lg transition-colors ${isSelf(u) ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'}`}
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

          {/* Confirmation Modal */}
          {confirmAction && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {confirmAction.type === 'delete' && 'Eliminar usuario'}
                  {confirmAction.type === 'toggle_active' && (confirmAction.user.is_active ? 'Desactivar usuario' : 'Activar usuario')}
                  {confirmAction.type === 'toggle_staff' && (confirmAction.user.is_staff ? 'Revocar rol admin' : 'Otorgar rol admin')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {confirmAction.type === 'delete' && (
                    <>¿Estás seguro de eliminar a <strong>{confirmAction.user.first_name || confirmAction.user.username}</strong>? Esta acción no se puede deshacer y eliminará todas sus propiedades.</>
                  )}
                  {confirmAction.type === 'toggle_active' && (
                    <>¿{confirmAction.user.is_active ? 'Desactivar' : 'Activar'} la cuenta de <strong>{confirmAction.user.first_name || confirmAction.user.username}</strong>?</>
                  )}
                  {confirmAction.type === 'toggle_staff' && (
                    <>¿{confirmAction.user.is_staff ? 'Revocar' : 'Otorgar'} permisos de administrador a <strong>{confirmAction.user.first_name || confirmAction.user.username}</strong>?</>
                  )}
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (confirmAction.type === 'delete') handleDeleteUser(confirmAction.user);
                      else if (confirmAction.type === 'toggle_active') handleToggleActive(confirmAction.user);
                      else if (confirmAction.type === 'toggle_staff') handleToggleStaff(confirmAction.user);
                    }}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                      confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'
                    }`}
                  >
                    Confirmar
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

export default AdminUsersPage;
