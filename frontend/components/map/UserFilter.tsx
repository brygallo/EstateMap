'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Owner } from '@/lib/types';

interface UserFilterProps {
  users: Owner[];
  selectedUserId: string;
  onSelect: (userId: string) => void;
}

/**
 * Selector de propietario con búsqueda. Muestra "Todos los usuarios" o el
 * propietario elegido y permite filtrar el listado escribiendo.
 */
export default function UserFilter({ users, selectedUserId, onSelect }: UserFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) => u.username.toLowerCase().includes(q));
  }, [users, search]);

  const selectedUser = users.find((u) => u.id === parseInt(selectedUserId, 10));
  const displayText =
    selectedUserId === 'all' ? 'Todos los usuarios' : selectedUser?.username || 'Usuario';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (userId: string) => {
    onSelect(userId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm bg-white border border-line rounded-lg text-textPrimary focus:border-primary focus:outline-none text-left flex items-center justify-between"
      >
        <span className="truncate">{displayText}</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-line rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-line">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar usuario..."
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-white border border-line rounded text-textPrimary placeholder-slate-400 focus:border-primary focus:outline-none"
                autoFocus
              />
              <svg
                className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect('all')}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${
                selectedUserId === 'all' ? 'bg-primary/10 text-primary font-medium' : 'text-textPrimary'
              }`}
            >
              Todos los usuarios
            </button>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user.id.toString())}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${
                    selectedUserId === user.id.toString()
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-textPrimary'
                  }`}
                >
                  {user.username}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-slate-400 text-center">
                No se encontraron usuarios
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
