'use client';

import { motion, type Variants } from 'motion/react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import RangeSlider from '@/components/RangeSlider';
import UserFilter from '@/components/map/UserFilter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import type { Owner, PropertyFilters } from '@/lib/types';

interface MapFiltersProps {
  filters: PropertyFilters;
  owners: Owner[];
  hasActiveFilters: boolean;
  onChange: (filters: PropertyFilters) => void;
  onClear: () => void;
}

// Entrada escalonada de cada campo del panel (respeta reduce-motion via Motion).
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
};

/** Panel de filtros del mapa: búsqueda, tipo, estado, usuario, precio y área. */
export default function MapFilters({
  filters,
  owners,
  hasActiveFilters,
  onChange,
  onClear,
}: MapFiltersProps) {
  const update = (patch: Partial<PropertyFilters>) => onChange({ ...filters, ...patch });

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="sticky top-0 z-10 space-y-3 border-b border-line bg-white/95 p-4 backdrop-blur"
    >
      <motion.div variants={item} className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-button bg-primaryLight text-primary">
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
        <h3 className="text-sm font-semibold text-textPrimary">Filtros</h3>
      </motion.div>

      {/* Búsqueda */}
      <motion.div variants={item} className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary"
          aria-hidden
        />
        <Input
          type="text"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          placeholder="Buscar propiedad..."
          className="rounded-button border-line pl-9"
        />
      </motion.div>

      {/* Tipo */}
      <motion.div variants={item}>
        <Select
          value={filters.propertyType}
          onValueChange={(value) => update({ propertyType: value })}
        >
          <SelectTrigger className="rounded-button border-line">
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
      <motion.div variants={item}>
        <Select value={filters.status} onValueChange={(value) => update({ status: value })}>
          <SelectTrigger className="rounded-button border-line">
            <SelectValue placeholder="Operación" />
          </SelectTrigger>
          <SelectContent className="rounded-card">
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="for_sale">En venta</SelectItem>
            <SelectItem value="for_rent">En alquiler</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Usuario */}
      <motion.div variants={item}>
        <UserFilter
          users={owners}
          selectedUserId={filters.userId}
          onSelect={(userId) => update({ userId })}
        />
      </motion.div>

      <Separator className="bg-line" />

      {/* Precio */}
      <motion.div variants={item} className="space-y-1">
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
      <motion.div variants={item} className="space-y-1">
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

      {/* Acciones */}
      {hasActiveFilters && (
        <motion.div variants={item} className="pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onClear}
            className="w-full rounded-button border-line text-error hover:bg-red-50 hover:text-error"
          >
            <X className="h-4 w-4" aria-hidden />
            Limpiar filtros
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
