'use client';

import { useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import RangeSlider from '@/components/RangeSlider';
import UserFilter from '@/components/map/UserFilter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { trackEvent } from '@/lib/analytics';
import { haptic } from '@/lib/haptics';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PRICE_MIN,
  PRICE_MAX,
  AREA_MIN,
  AREA_MAX,
} from '@/hooks/usePropertyFilters';
import type { Owner, PropertyFilters, PropertyLocationGroup } from '@/lib/types';
import { getPropertyTypeLabel } from '@/lib/property-labels';
import { buildFilterChips } from '@/lib/filter-chips';

interface MapFiltersProps {
  filters: PropertyFilters;
  owners: Owner[];
  locations: PropertyLocationGroup[];
  hasActiveFilters: boolean;
  onChange: (filters: PropertyFilters) => void;
  onClear: () => void;
}

const QUICK_FILTERS = [
  { key: 'for_sale', label: 'Venta', patch: { status: 'for_sale' } },
  { key: 'for_rent', label: 'Alquiler', patch: { status: 'for_rent' } },
  { key: 'house', label: 'Casas', patch: { propertyType: 'house' } },
  { key: 'land', label: 'Terrenos', patch: { propertyType: 'land' } },
  { key: 'apartment', label: 'Departamentos', patch: { propertyType: 'apartment' } },
] satisfies { key: string; label: string; patch: Partial<PropertyFilters> }[];

// Entrada escalonada de cada campo del panel (respeta reduce-motion via Motion).
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
};

/**
 * Cabecera del panel lateral: buscador de propiedades siempre visible con un
 * botón que despliega el resto de filtros, y chips de filtros activos (cada uno
 * con una X para quitarlo).
 */
export default function MapFilters({
  filters,
  owners,
  locations,
  hasActiveFilters,
  onChange,
  onClear,
}: MapFiltersProps) {
  const [open, setOpen] = useState(false);
  const update = (patch: Partial<PropertyFilters>, source = 'advanced') => {
    const next = { ...filters, ...patch };
    // Chips and selects re-query the map behind the sheet, so the visible
    // result is off screen at the moment of the tap. The tick is the local
    // acknowledgement. Typing in the search box is excluded — a buzz per
    // keystroke would be unbearable.
    if (source !== 'search') haptic('selection');
    trackEvent('map_filter_changed', {
      source,
      property_type: next.propertyType,
      status: next.status,
      province: next.province,
      city: next.city,
      has_search: Boolean(next.search),
    });
    onChange(next);
  };

  // Ciudades disponibles según la provincia elegida (o todas si es "all").
  const selectedProvince = locations.find((g) => g.province === filters.province);
  const cityOptions = filters.province !== 'all'
    ? selectedProvince?.cities ?? []
    : Array.from(new Set(locations.flatMap((g) => g.cities))).sort((a, b) => a.localeCompare(b));

  // es-EC keeps SSR and client formatting identical (avoids hydration diffs).
  const money = (v: number) => `$${v.toLocaleString('es-EC')}`;

  // Active filter chips. The search term is dropped here: it already has its
  // own input right above.
  const chips = buildFilterChips(filters, owners).filter((chip) => chip.key !== 'search');

  return (
    <div className="sticky top-0 z-10 space-y-2.5 border-b border-line bg-white/95 px-3 py-2.5 backdrop-blur">
      {/* Buscador de propiedades + botón de filtros */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary"
            aria-hidden
          />
          {/* `type="search"` gives the platform clear button, and the two
              hints tell a mobile keyboard to show a search key instead of a
              newline. */}
          <Input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value }, 'search')}
            placeholder="Buscar propiedad..."
            aria-label="Buscar propiedad"
            className="h-9 rounded-button border-line pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Mostrar filtros"
          title="Filtros"
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-button border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            open || chips.length > 0
              ? 'border-primary bg-primaryLight text-primary'
              : 'border-line bg-white text-textPrimary hover:bg-muted'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
          {chips.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[0.65rem] font-bold text-primary-foreground">
              {chips.length}
            </span>
          )}
        </button>
      </div>

      <div className="relative -mx-3">
        <div className="flex gap-2 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {QUICK_FILTERS.map((quick) => {
            const active =
              quick.patch.status != null
                ? filters.status === quick.patch.status
                : filters.propertyType === quick.patch.propertyType;
            const patch =
              quick.patch.status != null
                ? { status: active ? 'all' : quick.patch.status }
                : { propertyType: active ? 'all' : quick.patch.propertyType };

            return (
              <button
                key={quick.key}
                type="button"
                onClick={() => update(patch, 'quick_chip')}
                className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-primary bg-primary text-white'
                    : 'border-line bg-white text-textPrimary hover:border-primary hover:bg-primaryLight hover:text-primary'
                }`}
                aria-pressed={active}
              >
                {quick.label}
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" aria-hidden />
      </div>

      {/* Chips de filtros activos */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => update(chip.patch, 'chip')}
              className="group flex items-center gap-1 rounded-full bg-primaryLight py-1 pl-2.5 pr-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              aria-label={`Quitar filtro ${chip.label}`}
            >
              <span className="max-w-[10rem] truncate">{chip.label}</span>
              <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 rounded-full border border-line bg-white py-1 pl-2.5 pr-2.5 text-xs font-medium text-error transition-colors hover:bg-red-50"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* Filtros colapsables */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            {/* The expanded panel lives inside the sticky header: cap its
                height and scroll internally so it never eats the whole sheet. */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid max-h-[55dvh] gap-3 overflow-y-auto overscroll-contain pt-1 sm:grid-cols-2"
            >
              {/* Tipo */}
              <motion.div variants={item} className="space-y-1.5">
                <Label className="text-xs font-medium text-textSecondary">Tipo</Label>
                <Select
                  value={filters.propertyType}
                  onValueChange={(value) => update({ propertyType: value })}
                >
                  <SelectTrigger aria-label="Tipo de propiedad" className="rounded-button border-line">
                    <SelectValue placeholder="Tipo de propiedad" />
                  </SelectTrigger>
                  <SelectContent className="rounded-card">
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="house">{getPropertyTypeLabel('house')}</SelectItem>
                    <SelectItem value="apartment">{getPropertyTypeLabel('apartment')}</SelectItem>
                    <SelectItem value="land">{getPropertyTypeLabel('land')}</SelectItem>
                    <SelectItem value="commercial">{getPropertyTypeLabel('commercial')}</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>

              {/* Estado */}
              <motion.div variants={item} className="space-y-1.5">
                <Label className="text-xs font-medium text-textSecondary">Operación</Label>
                <Select value={filters.status} onValueChange={(value) => update({ status: value })}>
                  <SelectTrigger aria-label="Operación" className="rounded-button border-line">
                    <SelectValue placeholder="Operación" />
                  </SelectTrigger>
                  <SelectContent className="rounded-card">
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="for_sale">En venta</SelectItem>
                    <SelectItem value="for_rent">En alquiler</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>

              {/* Provincia */}
              {locations.length > 0 && (
                <motion.div variants={item} className="space-y-1.5">
                  <Label className="text-xs font-medium text-textSecondary">Provincia</Label>
                  <Select
                    value={filters.province}
                    onValueChange={(value) => update({ province: value, city: 'all' })}
                  >
                    <SelectTrigger aria-label="Provincia" className="rounded-button border-line">
                      <SelectValue placeholder="Provincia" />
                    </SelectTrigger>
                    <SelectContent className="rounded-card">
                      <SelectItem value="all">Todas las provincias</SelectItem>
                      {locations.map((g) => (
                        <SelectItem key={g.province} value={g.province}>
                          {g.province}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}

              {/* Ciudad */}
              {cityOptions.length > 0 && (
                <motion.div variants={item} className="space-y-1.5">
                  <Label className="text-xs font-medium text-textSecondary">Ciudad</Label>
                  <Select value={filters.city} onValueChange={(value) => update({ city: value })}>
                    <SelectTrigger aria-label="Ciudad" className="rounded-button border-line">
                      <SelectValue placeholder="Ciudad" />
                    </SelectTrigger>
                    <SelectContent className="rounded-card">
                      <SelectItem value="all">Todas las ciudades</SelectItem>
                      {cityOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}

              {/* Usuario */}
              <motion.div variants={item} className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium text-textSecondary">Anunciante</Label>
                <UserFilter
                  users={owners}
                  selectedUserId={filters.userId}
                  onSelect={(userId) => update({ userId })}
                />
              </motion.div>

              <Separator className="bg-line sm:col-span-2" />

              {/* Precio */}
              <motion.div variants={item} className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-medium text-textSecondary">Precio (USD)</Label>
                <RangeSlider
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={1000}
                  minValue={filters.minPrice}
                  maxValue={filters.maxPrice}
                  onChange={(min, max) => update({ minPrice: min, maxPrice: max })}
                  formatValue={money}
                  theme="light"
                  minLabel="Precio mínimo"
                  maxLabel="Precio máximo"
                />
              </motion.div>

              {/* Área */}
              <motion.div variants={item} className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-medium text-textSecondary">Área (m²)</Label>
                <RangeSlider
                  min={AREA_MIN}
                  max={AREA_MAX}
                  step={50}
                  minValue={filters.minArea}
                  maxValue={filters.maxArea}
                  onChange={(min, max) => update({ minArea: min, maxArea: max })}
                  formatValue={(v) => `${v.toLocaleString('es-EC')} m²`}
                  theme="light"
                  minLabel="Área mínima"
                  maxLabel="Área máxima"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
