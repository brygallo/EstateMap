'use client';

import RangeSlider from '@/components/RangeSlider';
import UserFilter from '@/components/map/UserFilter';
import {
  PRICE_MIN,
  PRICE_MAX,
  AREA_MIN,
  AREA_MAX,
} from '@/hooks/usePropertyFilters';
import type { Owner, PropertyFilters } from '@/lib/types';

interface MapFiltersProps {
  filters: PropertyFilters;
  owners: Owner[];
  hasActiveFilters: boolean;
  onChange: (filters: PropertyFilters) => void;
  onClear: () => void;
  onShare: () => void;
}

/** Panel de filtros del mapa: búsqueda, tipo, estado, usuario, precio y área. */
export default function MapFilters({
  filters,
  owners,
  hasActiveFilters,
  onChange,
  onClear,
  onShare,
}: MapFiltersProps) {
  const update = (patch: Partial<PropertyFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="p-3 bg-white border-b border-line sticky top-0 lg:top-0 z-10 space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-textSecondary flex items-center gap-1.5 mb-1">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filtros
      </h3>

      {/* Búsqueda */}
      <div className="relative">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          placeholder="Buscar..."
          className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-line rounded-lg text-textPrimary placeholder-slate-400 focus:border-primary focus:outline-none"
        />
        <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Tipo */}
      <select
        value={filters.propertyType}
        onChange={(e) => update({ propertyType: e.target.value })}
        className="w-full px-3 py-2 text-sm bg-white border border-line rounded-lg text-textPrimary focus:border-primary focus:outline-none"
      >
        <option value="all">Todos los tipos</option>
        <option value="house">Casa</option>
        <option value="apartment">Apartamento</option>
        <option value="land">Terreno</option>
        <option value="commercial">Comercial</option>
      </select>

      {/* Estado */}
      <select
        value={filters.status}
        onChange={(e) => update({ status: e.target.value })}
        className="w-full px-3 py-2 text-sm bg-white border border-line rounded-lg text-textPrimary focus:border-primary focus:outline-none"
      >
        <option value="all">Todos los estados</option>
        <option value="for_sale">En venta</option>
        <option value="for_rent">En alquiler</option>
      </select>

      {/* Usuario */}
      <UserFilter
        users={owners}
        selectedUserId={filters.userId}
        onSelect={(userId) => update({ userId })}
      />

      {/* Precio */}
      <div className="space-y-0.5">
        <label className="block text-xs font-medium text-textSecondary">Precio (USD)</label>
        <RangeSlider
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={1000}
          minValue={filters.minPrice}
          maxValue={filters.maxPrice}
          onChange={(min, max) => update({ minPrice: min, maxPrice: max })}
          formatValue={(v) => `$${v.toLocaleString()}`}
          theme="light"
        />
      </div>

      {/* Área */}
      <div className="space-y-0.5">
        <label className="block text-xs font-medium text-textSecondary">Área (m²)</label>
        <RangeSlider
          min={AREA_MIN}
          max={AREA_MAX}
          step={50}
          minValue={filters.minArea}
          maxValue={filters.maxArea}
          onChange={(min, max) => update({ minArea: min, maxArea: max })}
          formatValue={(v) => `${v.toLocaleString()} m²`}
          theme="light"
        />
      </div>

      {/* Limpiar filtros */}
      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="btn btn-sm btn-ghost border border-line w-full text-error hover:bg-red-50"
        >
          Limpiar filtros
        </button>
      )}

      {/* Compartir */}
      <button onClick={onShare} className="btn btn-sm btn-primary w-full">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Compartir Búsqueda
      </button>
    </div>
  );
}
