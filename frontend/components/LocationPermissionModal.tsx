'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin, X } from 'lucide-react';
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
    <div className={`pointer-events-none fixed inset-x-0 bottom-4 z-top flex justify-center px-4 transition-all duration-300 sm:justify-end ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
      <div className="pointer-events-auto w-full max-w-xl rounded-modal border border-line bg-surface p-4 shadow-cardHover">
        <div className="flex gap-3">
          <div className="hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-card bg-primaryLight text-primary sm:flex">
            <MapPin className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-textPrimary">
                  Ver propiedades cerca de ti
                </h2>
                <p className="mt-1 text-sm leading-5 text-textSecondary">
                  Podemos centrar el mapa en tu zona. Tu ubicación no se comparte con terceros.
                </p>
              </div>
              <button
                type="button"
                onClick={onDecline}
                disabled={isLoading}
                className="rounded-button p-1.5 text-textSecondary transition-colors hover:bg-muted hover:text-textPrimary disabled:opacity-50"
                aria-label="Cerrar aviso de ubicación"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onDecline}
                disabled={isLoading}
                className="h-9 border-line"
              >
                Ahora no
              </Button>
              <Button
                type="button"
                onClick={onAccept}
                disabled={isLoading}
                className="h-9"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    <span>Buscando...</span>
                  </>
                ) : (
                  'Usar mi ubicación'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionModal;
