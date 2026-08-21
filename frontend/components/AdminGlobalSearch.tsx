'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  href: string;
}

interface SearchGroup {
  type: string;
  label: string;
  results: SearchResult[];
}

const MIN_LENGTH = 2;
// Lo que se tarda en dejar de escribir. Por debajo se dispara una consulta por
// tecla contra cuatro tablas a la vez.
const DEBOUNCE_MS = 250;

const AdminGlobalSearch = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (term: string) => {
    if (term.trim().length < MIN_LENGTH) {
      setGroups([]);
      return;
    }
    setLoading(true);
    try {
      const response = await apiGet(`/admin/search/?q=${encodeURIComponent(term.trim())}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setGroups(data.groups || []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void search(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Cerrar al pulsar fuera: el desplegable tapa la navegación que hay debajo.
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  // Atajo de teclado: es la acción más repetida del panel y merece no tener
  // que buscar la caja con el ratón.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQuery('');
    setGroups([]);
    router.push(href);
  };

  return (
    <div ref={containerRef} className="relative px-2 pb-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar en todo el panel"
          aria-label="Buscar en todo el panel"
          data-testid="admin-global-search"
          className="w-full rounded-button border border-line bg-background py-2 pl-9 pr-10 text-sm text-textPrimary outline-none transition-colors placeholder:text-textSecondary focus:border-primary"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-textSecondary">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '⌘K'}
        </span>
      </div>

      {open && query.trim().length >= MIN_LENGTH && (
        <div className="absolute left-2 right-2 z-panel mt-1 max-h-[60dvh] overflow-y-auto rounded-card border border-line bg-surface shadow-cardHover">
          {groups.length === 0 ? (
            <p className="px-3 py-4 text-xs text-textSecondary">
              {loading ? 'Buscando…' : 'Nada coincide con esa búsqueda.'}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.type} className="border-b border-line last:border-0">
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-textSecondary">
                  {group.label}
                </p>
                {group.results.map((result) => (
                  <button
                    key={`${group.type}-${result.id}`}
                    onClick={() => go(result.href)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-textPrimary">{result.title}</span>
                      {result.subtitle && (
                        <span className="block truncate text-xs text-textSecondary">{result.subtitle}</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                        result.badge === 'papelera'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-muted text-textSecondary',
                      )}
                    >
                      {result.badge}
                    </span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdminGlobalSearch;
