import { cn } from '@/lib/utils';

/**
 * Capa ambiental compartida del ecosistema Aents. Es CSS puro, no intercepta
 * eventos y se apaga automáticamente cuando el usuario reduce movimiento.
 */
export default function BrandAtmosphere({ className }: { className?: string }) {
  return (
    <div className={cn('aents-atmosphere pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="aents-brand-grid absolute inset-0" />
      <div className="aents-aura aents-aura-primary" />
      <div className="aents-aura aents-aura-secondary" />
      <div className="aents-ancestral-line" />
    </div>
  );
}
