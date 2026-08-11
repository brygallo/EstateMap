'use client';

import { X } from 'lucide-react';
import { buildFilterChips } from '@/lib/filter-chips';
import { trackEvent } from '@/lib/analytics';
import { haptic } from '@/lib/haptics';
import type { Owner, PropertyFilters } from '@/lib/types';

interface MapActiveFiltersProps {
  filters: PropertyFilters;
  owners: Owner[];
  onChange: (filters: PropertyFilters) => void;
  onClear: () => void;
}

/**
 * Active filter chips laid over the map, mobile only.
 *
 * On a phone the filters live inside the bottom sheet, so once the sheet is
 * down the map shows a filtered result with nothing on screen saying so — an
 * empty map reads as "there is nothing here" instead of "you filtered it out".
 * This row keeps every active filter visible and one tap away from being
 * removed, without opening the sheet again.
 */
export default function MapActiveFilters({
  filters,
  owners,
  onChange,
  onClear,
}: MapActiveFiltersProps) {
  const chips = buildFilterChips(filters, owners);
  if (chips.length === 0) return null;

  const remove = (chip: (typeof chips)[number]) => {
    const next = { ...filters, ...chip.patch };
    haptic('selection');
    trackEvent('map_filter_changed', {
      source: 'map_overlay_chip',
      property_type: next.propertyType,
      status: next.status,
      province: next.province,
      city: next.city,
      has_search: Boolean(next.search),
    });
    onChange(next);
  };

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-3 z-mapcontrol lg:hidden"
      role="group"
      aria-label="Filtros activos"
    >
      <div className="pointer-events-auto flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => remove(chip)}
            aria-label={`Quitar filtro ${chip.label}`}
            className="flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-white/95 py-1.5 pl-3 pr-2 text-xs font-semibold text-primary shadow-card backdrop-blur transition-colors active:bg-primaryLight"
          >
            <span className="max-w-[9rem] truncate">{chip.label}</span>
            <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          </button>
        ))}
        {chips.length > 1 && (
          <button
            type="button"
            onClick={() => {
              haptic('selection');
              trackEvent('map_filters_cleared', { source: 'map_overlay_chip' });
              onClear();
            }}
            className="shrink-0 rounded-full border border-line bg-white/95 px-3 py-1.5 text-xs font-semibold text-error shadow-card backdrop-blur transition-colors active:bg-red-50"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
