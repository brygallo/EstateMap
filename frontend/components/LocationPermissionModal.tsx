'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, MapPin, Settings, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isLoading?: boolean;
  blocked?: boolean;
}

const LocationPermissionModal = ({
  isOpen,
  onAccept,
  onDecline,
  isLoading = false,
  blocked = false,
}: LocationPermissionModalProps) => {
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
          <div className={`hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-card sm:flex ${
            blocked ? 'bg-warningBg text-warning' : 'bg-primaryLight text-primary'
          }`}>
            {blocked ? (
              <AlertCircle className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            ) : (
              <MapPin className="h-6 w-6" strokeWidth={1.75} aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-textPrimary">
                  {blocked ? 'Activa la ubicación para usar el mapa cerca de ti' : 'Ver propiedades cerca de ti'}
                </h2>
                <p className="mt-1 text-sm leading-5 text-textSecondary">
                  {blocked
                    ? 'Tu iPhone o navegador está bloqueando el permiso. Cámbialo una vez y luego vuelve a tocar “Intentar de nuevo”.'
                    : 'Podemos centrar el mapa en tu zona. Tu ubicación no se comparte con terceros.'}
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

            {blocked && (
              <div className="mt-3 rounded-card border border-warning/20 bg-warningBg/70 p-3">
                <div className="flex items-start gap-2">
                  <Smartphone className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" strokeWidth={2} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-textPrimary">En iPhone</p>
                    <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs leading-5 text-textSecondary">
                      <li>Abre Ajustes del iPhone.</li>
                      <li>Entra a Privacidad y seguridad, luego Localización.</li>
                      <li>Activa Localización.</li>
                      <li>Busca Safari o Chrome y permite ubicación mientras usas la app.</li>
                      <li>Regresa aquí y toca Intentar de nuevo.</li>
                    </ol>
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-2">
                  <Settings className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" strokeWidth={2} aria-hidden />
                  <p className="text-xs leading-5 text-textSecondary">
                    Si Safari no vuelve a preguntar, toca el icono <span className="font-semibold text-textPrimary">aA</span> o candado junto a la barra, entra a ajustes del sitio y cambia Ubicación a permitir.
                  </p>
                </div>
              </div>
            )}

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
                  blocked ? 'Intentar de nuevo' : 'Usar mi ubicación'
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
