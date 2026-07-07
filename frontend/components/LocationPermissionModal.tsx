'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isLoading?: boolean;
}

const LocationPermissionModal = ({ isOpen, onAccept, onDecline, isLoading = false }: LocationPermissionModalProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay for animation
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-top flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onDecline}></div>

      <div className={`relative mx-4 w-full max-w-md transform rounded-modal border border-line bg-surface p-6 shadow-cardHover transition-all duration-300 ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-primaryLight p-4 text-primary">
            <MapPin className="h-10 w-10" strokeWidth={1.75} aria-hidden />
          </div>
        </div>

        <h2 className="mb-3 text-center text-2xl font-bold text-textPrimary">
          ¿Permitir ubicación?
        </h2>

        <p className="mb-6 text-center leading-relaxed text-textSecondary">
          Permítenos acceder a tu ubicación para mostrarte propiedades cerca de ti y mejorar tu experiencia de búsqueda.
        </p>

        <div className="mb-6 space-y-3">
          {[
            'Ver el mapa centrado en tu ciudad',
            'Encontrar propiedades cercanas más fácilmente',
            'Experiencia personalizada según tu zona',
          ].map((benefit) => (
            <div key={benefit} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-successBg text-success">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              </div>
              <p className="text-sm text-textPrimary">{benefit}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onDecline}
            disabled={isLoading}
            className="flex-1"
          >
            No, gracias
          </Button>
          <Button
            type="button"
            onClick={onAccept}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>Obteniendo...</span>
              </>
            ) : (
              'Permitir'
            )}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-textSecondary">
          Tu ubicación no será compartida con terceros
        </p>
      </div>
    </div>
  );
};

export default LocationPermissionModal;
