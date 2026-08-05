'use client';

import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useField } from 'formik';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type AuthFieldProps = Omit<ComponentProps<typeof Input>, 'name' | 'id'> & {
  id: string;
  name: string;
  label: string;
  icon?: LucideIcon;
  /** Shown while the field is valid, and replaced by the error when it is not. */
  hint?: string;
};

/**
 * Label, optional leading icon, input, and a single line below that carries
 * either the hint or the validation error. Reserving one line for both keeps
 * the form from jumping as errors appear.
 */
export default function AuthField({
  id,
  name,
  label,
  icon: Icon,
  hint,
  className,
  ...inputProps
}: AuthFieldProps) {
  const [field, meta] = useField(name);
  const invalid = Boolean(meta.touched && meta.error);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-textSecondary">
        {label}
      </Label>
      <div className="relative">
        {Icon ? (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        ) : null}
        <Input
          id={id}
          {...field}
          {...inputProps}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : hint ? hintId : undefined}
          className={cn(
            'h-11 rounded-input',
            Icon && 'pl-10',
            invalid && 'border-error focus-visible:ring-error',
            className,
          )}
        />
      </div>
      {invalid ? (
        <p id={errorId} className="text-xs text-error">
          {meta.error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
