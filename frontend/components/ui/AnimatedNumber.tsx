'use client';

import { useEffect } from 'react';
import {
  useMotionValue,
  useSpring,
  useTransform,
  motion,
  useReducedMotion,
} from 'motion/react';
import { cn } from '@/lib/utils';

type AnimatedNumberProps = {
  /** Valor final a mostrar. */
  value: number;
  /** Locale para formateo. Por defecto es-EC. */
  locale?: string;
  /** Opciones de Intl.NumberFormat (p. ej. { style: 'currency', currency: 'USD' }). */
  format?: Intl.NumberFormatOptions;
  className?: string;
  /** Prefijo (p. ej. "$"). Se ignora si `format` ya incluye currency. */
  prefix?: string;
  /** Sufijo (p. ej. " USD", " m²"). */
  suffix?: string;
};

/**
 * Contador animado para precios/cifras. Anima de 0 al valor con un spring suave.
 * Respeta prefers-reduced-motion (muestra el valor final sin animar).
 * Pensado para usarse con la clase de marca `price`/`font-geo` en el className.
 */
export default function AnimatedNumber({
  value,
  locale = 'es-EC',
  format,
  className,
  prefix,
  suffix,
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 90,
    damping: 20,
    mass: 0.8,
  });

  const display = useTransform(reduceMotion ? motionValue : spring, (latest) => {
    const rounded =
      format?.maximumFractionDigits || format?.minimumFractionDigits
        ? latest
        : Math.round(latest);
    const formatted = new Intl.NumberFormat(locale, format).format(rounded);
    return `${prefix ?? ''}${formatted}${suffix ?? ''}`;
  });

  useEffect(() => {
    // Con motion reducido el valor se lee directo (salto instantáneo);
    // con animación, el spring interpola hacia el nuevo valor.
    motionValue.set(value);
  }, [value, motionValue]);

  return (
    <motion.span className={cn('tabular-nums', className)}>
      {display}
    </motion.span>
  );
}
