'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Province {
  id: number;
  name: string;
  code?: string;
  cities_count?: number;
}

interface City {
  id: number;
  name: string;
  code?: string;
  province: number;
  province_name?: string;
}

interface LocationSelectProps {
  provinceValue: string;
  cityValue: string;
  onProvinceChange: (value: string) => void;
  onCityChange: (value: string) => void;
  required?: boolean;
}

interface ComboboxOption {
  value: number;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onSelect: (option: ComboboxOption) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * Buscador tipo combobox (Popover + Command) que reemplaza a react-select.
 * Mantiene búsqueda en vivo y estilo del sistema de diseño.
 */
const Combobox = ({
  options,
  value,
  onSelect,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  loading = false,
}: ComboboxProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            'h-12 w-full justify-between rounded-input border-line px-4 font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
            <span className="truncate">{value || placeholder}</span>
          </span>
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-60" />
          ) : (
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] rounded-input p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-11" />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.label ? 'opacity-100 text-primary' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const LocationSelect = ({
  provinceValue,
  cityValue,
  onProvinceChange,
  onCityChange,
  required = false,
}: LocationSelectProps) => {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    loadProvinces();
  }, []);

  useEffect(() => {
    if (provinceValue && provinces.length > 0) {
      const province = provinces.find((p) => p.name === provinceValue);
      if (province) {
        setSelectedProvinceId(province.id);
        loadCities(province.id);
      }
    }
  }, [provinceValue, provinces]);

  const loadProvinces = async () => {
    try {
      const response = await fetch(`${API_URL}/provinces/`);
      if (response.ok) {
        const data = await response.json();
        setProvinces(data);
      }
    } catch (error) {
      console.error('Error cargando provincias:', error);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const loadCities = async (provinceId: number) => {
    setLoadingCities(true);
    try {
      const response = await fetch(`${API_URL}/cities/?province=${provinceId}`);
      if (response.ok) {
        const data = await response.json();
        setCities(data);
      }
    } catch (error) {
      console.error('Error cargando ciudades:', error);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleProvinceChange = (option: ComboboxOption) => {
    setSelectedProvinceId(option.value);
    onProvinceChange(option.label);
    onCityChange('');
    loadCities(option.value);
  };

  const handleCityChange = (option: ComboboxOption) => {
    onCityChange(option.label);
  };

  const provinceOptions: ComboboxOption[] = provinces.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const cityOptions: ComboboxOption[] = cities.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-textPrimary">
          Provincia {required && <span className="text-error">*</span>}
        </label>
        <Combobox
          options={provinceOptions}
          value={provinceValue}
          onSelect={handleProvinceChange}
          placeholder="Selecciona una provincia..."
          searchPlaceholder="Buscar provincia..."
          emptyMessage="No hay provincias disponibles"
          loading={loadingProvinces}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-textPrimary">
          Ciudad {required && <span className="text-error">*</span>}
        </label>
        <Combobox
          options={cityOptions}
          value={cityValue}
          onSelect={handleCityChange}
          placeholder={
            !selectedProvinceId
              ? 'Primero selecciona una provincia'
              : 'Selecciona una ciudad...'
          }
          searchPlaceholder="Buscar ciudad..."
          emptyMessage={
            !selectedProvinceId
              ? 'Primero selecciona una provincia'
              : 'No hay ciudades disponibles'
          }
          disabled={!selectedProvinceId}
          loading={loadingCities}
        />
      </div>
    </div>
  );
};

export default LocationSelect;
