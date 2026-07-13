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

interface MapFiltersProps {
  filters: PropertyFilters;
  owners: Owner[];
  locations: PropertyLocationGroup[];
  hasActiveFilters: boolean;
  onChange: (filters: PropertyFilters) => void;
  onClear: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  house: 'Casa',
  apartment: 'Apartamento',
  land: 'Terreno',
  commercial: 'Comercial',
};
const STATUS_LABELS: Record<string, string> = {
  for_sale: 'En venta',
  for_rent: 'En alquiler',
};

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

  const priceChanged = filters.minPrice !== PRICE_MIN || filters.maxPrice !== PRICE_MAX;
  const areaChanged = filters.minArea !== AREA_MIN || filters.maxArea !== AREA_MAX;
  const money = (v: number) => `$${v.toLocaleString()}`;

  // Chips de filtros activos (sin la búsqueda, que ya tiene su propio campo).
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.propertyType !== 'all') {
    chips.push({
      key: 'type',
      label: TYPE_LABELS[filters.propertyType] || filters.propertyType,
      clear: () => update({ propertyType: 'all' }),
    });
  }
  if (filters.status !== 'all') {
    chips.push({
      key: 'status',
      label: STATUS_LABELS[filters.status] || filters.status,
      clear: () => update({ status: 'all' }),
    });
  }
  if (filters.province !== 'all') {
    chips.push({
      key: 'province',
      label: filters.province,
      // Al quitar la provincia también se limpia la ciudad (depende de ella).
      clear: () => update({ province: 'all', city: 'all' }),
    });
  }
  if (filters.city !== 'all') {
    chips.push({
      key: 'city',
      label: filters.city,
      clear: () => update({ city: 'all' }),
    });
  }
  if (filters.userId !== 'all') {
    const owner = owners.find((o) => String(o.id) === String(filters.userId));
    chips.push({
      key: 'user',
      label: owner ? owner.username : 'Usuario',
      clear: () => update({ userId: 'all' }),
    });
  }
  if (priceChanged) {
    const label =
      filters.minPrice !== PRICE_MIN && filters.maxPrice !== PRICE_MAX
        ? `${money(filters.minPrice)}–${money(filters.maxPrice)}`
        : filters.minPrice !== PRICE_MIN
          ? `Desde ${money(filters.minPrice)}`
          : `Hasta ${money(filters.maxPrice)}`;
    chips.push({
      key: 'price',
      label,
      clear: () => update({ minPrice: PRICE_MIN, maxPrice: PRICE_MAX }),
    });
  }
  if (areaChanged) {
    const label =
      filters.minArea !== AREA_MIN && filters.maxArea !== AREA_MAX
        ? `${filters.minArea.toLocaleString()}–${filters.maxArea.toLocaleString()} m²`
        : filters.minArea !== AREA_MIN
          ? `Desde ${filters.minArea.toLocaleString()} m²`
          : `Hasta ${filters.maxArea.toLocaleString()} m²`;
    chips.push({
      key: 'area',
      label,
      clear: () => update({ minArea: AREA_MIN, maxArea: AREA_MAX }),
    });
  }

  return (
    <div className="sticky top-0 z-10 space-y-2.5 border-b border-line bg-white/95 px-3 py-2.5 backdrop-blur">
      {/* Buscador de propiedades + botón de filtros */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary"
            aria-hidden
          />
          <Input
            type="text"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Buscar propiedad..."
            className="h-9 rounded-button border-line pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Mostrar filtros"
          title="Filtros"
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-button border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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

      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
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

      {/* Chips de filtros activos */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
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
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid gap-3 pt-1 sm:grid-cols-2"
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
                    <SelectItem value="house">Casa</SelectItem>
                    <SelectItem value="apartment">Apartamento</SelectItem>
                    <SelectItem value="land">Terreno</SelectItem>
                    <SelectItem value="commercial">Comercial</SelectItem>
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
                  formatValue={(v) => `$${v.toLocaleString()}`}
                  theme="light"
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
                  formatValue={(v) => `${v.toLocaleString()} m²`}
                  theme="light"
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
