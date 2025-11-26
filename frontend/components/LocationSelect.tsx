'use client';

import { useState, useEffect } from 'react';
import Select from 'react-select';

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

  // Cargar provincias al montar el componente
  useEffect(() => {
    loadProvinces();
  }, []);

  // Cuando cambia provinceValue (de props), buscar el ID de la provincia
  useEffect(() => {
    if (provinceValue && provinces.length > 0) {
      const province = provinces.find(p => p.name === provinceValue);
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

  const handleProvinceChange = (option: any) => {
    if (option) {
      setSelectedProvinceId(option.value);
      onProvinceChange(option.label);
      onCityChange(''); // Limpiar ciudad al cambiar provincia
      loadCities(option.value);
    } else {
      setSelectedProvinceId(null);
      onProvinceChange('');
      onCityChange('');
      setCities([]);
    }
  };

  const handleCityChange = (option: any) => {
    if (option) {
      onCityChange(option.label);
    } else {
      onCityChange('');
    }
  };

  // Opciones para react-select
  const provinceOptions = provinces.map(p => ({
    value: p.id,
    label: p.name,
  }));

  const cityOptions = cities.map(c => ({
    value: c.id,
    label: c.name,
  }));

  // Valores seleccionados actuales
  const selectedProvince = provinceOptions.find(o => o.label === provinceValue) || null;
  const selectedCity = cityOptions.find(o => o.label === cityValue) || null;

  // Estilos personalizados para react-select
  const customStyles = {
    control: (base: any, state: any) => ({
      ...base,
      borderRadius: '0.75rem',
      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : 'none',
      '&:hover': {
        borderColor: '#3b82f6',
      },
      minHeight: '48px',
      padding: '0 0.5rem',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#3b82f6'
        : state.isFocused
        ? '#eff6ff'
        : 'white',
      color: state.isSelected ? 'white' : '#1f2937',
      '&:active': {
        backgroundColor: '#3b82f6',
      },
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: '0.75rem',
      overflow: 'hidden',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    }),
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Provincia */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Provincia {required && <span className="text-red-500">*</span>}
        </label>
        <Select
          options={provinceOptions}
          value={selectedProvince}
          onChange={handleProvinceChange}
          isLoading={loadingProvinces}
          isClearable
          placeholder="Selecciona una provincia..."
          noOptionsMessage={() => 'No hay provincias disponibles'}
          styles={customStyles}
          required={required}
        />
      </div>

      {/* Ciudad */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Ciudad {required && <span className="text-red-500">*</span>}
        </label>
        <Select
          options={cityOptions}
          value={selectedCity}
          onChange={handleCityChange}
          isLoading={loadingCities}
          isClearable
          isDisabled={!selectedProvinceId}
          placeholder={
            !selectedProvinceId
              ? 'Primero selecciona una provincia'
              : 'Selecciona una ciudad...'
          }
          noOptionsMessage={() =>
            !selectedProvinceId
              ? 'Primero selecciona una provincia'
              : 'No hay ciudades disponibles'
          }
          styles={customStyles}
          required={required}
        />
      </div>
    </div>
  );
};

export default LocationSelect;
