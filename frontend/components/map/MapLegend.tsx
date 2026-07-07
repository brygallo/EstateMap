'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Info, X } from 'lucide-react';

const ITEMS = [
  { label: 'En venta', color: '#10B981' },
  { label: 'En alquiler', color: '#2563EB' },
  { label: 'Inactivo', color: '#64748B' },
];

/**
 * Leyenda de colores de estado de las propiedades. Botón (i) anclado
 * abajo-izquierda (sobre el conmutador de capa) que despliega un panel.
 */
export default function MapLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-[128px] left-3 z-mapcontrol">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute bottom-11 left-0 w-48 rounded-card bg-surface p-3 shadow-cardHover ring-1 ring-black/5"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-textPrimary">Leyenda</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar leyenda"
                className="rounded p-0.5 text-textSecondary transition-colors hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <ul className="space-y-1.5">
              {ITEMS.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-xs text-textPrimary">
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-sm ring-1 ring-black/10"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Mostrar leyenda del mapa"
        title="Leyenda"
        className={`flex h-9 w-9 items-center justify-center rounded-lg bg-surface shadow-cardHover ring-1 ring-black/5 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          open ? 'text-primary' : 'text-textPrimary'
        }`}
      >
        <Info className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
