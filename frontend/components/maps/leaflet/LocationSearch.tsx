'use client';

import { useMap } from 'react-leaflet';
import { useEffect, useRef, useState } from 'react';

// Buscador sobre el mapa: solo busca ubicaciones (Nominatim).
export function LocationSearch() {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const runSearch = async (value: string) => {
    const q = value.trim();
    if (!q) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }

    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        format: 'json',
        q,
        countrycodes: 'ec',
        addressdetails: '1',
        limit: '5',
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: {
          'User-Agent': 'EstateMap/1.0 (contact: soporte@estatemap.local)',
          'Accept-Language': 'es',
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error('No se pudo buscar ubicación');
      }
      const data = await res.json();
      setResults(data || []);
      if ((data || []).length === 0) {
        setError('Sin resultados');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError('Error al buscar ubicación');
        setResults([]);
      }
    } finally {
      setLoading(false);
      controllerRef.current = null;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (!trimmed) {
      if (controllerRef.current) controllerRef.current.abort();
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(trimmed), 350);
  };

  const handleSelect = (place: any) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);

    if (place.boundingbox && place.boundingbox.length === 4) {
      const [south, north, west, east] = place.boundingbox.map((v: string) => parseFloat(v));
      if ([south, north, west, east].every(Number.isFinite)) {
        map.fitBounds(
          [
            [south, west],
            [north, east],
          ],
          { maxZoom: 16 }
        );
      } else if (Number.isFinite(lat) && Number.isFinite(lon)) {
        map.flyTo([lat, lon], 15, { duration: 1.2 });
      }
    } else if (Number.isFinite(lat) && Number.isFinite(lon)) {
      map.flyTo([lat, lon], 15, { duration: 1.2 });
    }

    setQuery(place.display_name || '');
    setResults([]);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute top-4 sm:top-4 left-1/2 -translate-x-1/2 z-nav w-[85%] sm:w-[70%] max-w-lg px-3">
      <div className="pointer-events-auto relative w-full">
        <form onSubmit={handleSearch} className="w-full">
          <div className="relative shadow-lg rounded-xl overflow-hidden bg-white">
            <input
              type="search"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Buscar ciudad, referencia..."
              className="w-full px-3 sm:px-4 py-2 pr-10 text-xs sm:text-sm text-textPrimary outline-none"
            />
            <button
              type="submit"
              className="absolute inset-y-0 right-0 px-3 text-primary hover:text-secondary disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0a12 12 0 00-8 20z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </button>
          </div>
        </form>
        {(results.length > 0 || error) && (
          <div className="absolute left-0 right-0 mt-1 bg-white shadow-xl rounded-xl overflow-hidden border border-line max-h-60 overflow-y-auto">
            {results.map((r) => (
              <button
                key={`${r.place_id}`}
                type="button"
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3 py-2 hover:bg-background text-sm"
              >
                <p className="font-semibold text-textPrimary line-clamp-1">{r.display_name}</p>
                <p className="text-xs text-textSecondary">{r.type}</p>
              </button>
            ))}
            {error && results.length === 0 && (
              <div className="px-3 py-2 text-sm text-textSecondary">{error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
