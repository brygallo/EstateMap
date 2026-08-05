import Image from 'next/image';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

type AuthCardProps = {
  /** Micro-label above the heading. Set in sentence case; the class uppercases it. */
  eyebrow: string;
  /**
   * Position inside a genuine two-screen flow (register → verify,
   * request reset → set password). Screens that stand alone omit it rather
   * than invent a sequence.
   */
  step?: { current: number; total: number };
  title: string;
  description: string;
  children: ReactNode;
  /** Tinted row closing the card. Used for the link out to the other flow. */
  footer?: ReactNode;
};

/**
 * The single surface every auth screen is built on.
 *
 * Heading and form live in the same card on purpose. They used to be siblings
 * under a bare wrapper, and `.aents-shell-content > *` painted that wrapper's
 * shadow — a square, transparent ghost box behind the form.
 */
export default function AuthCard({
  eyebrow,
  step,
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <Card className="overflow-hidden rounded-modal border-line bg-background shadow-cardHover">
      <CardContent className="p-6 sm:p-8">
        <header className="mb-6 text-center">
          <Image
            src="/aents/aents-brand-tile-256.png"
            alt=""
            width={48}
            height={48}
            className="aents-brand-symbol mx-auto h-12 w-12"
            aria-hidden
            priority
          />
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {eyebrow}
            </span>
            {step ? (
              <span className="rounded-full bg-primaryLight px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
                {step.current} de {step.total}
              </span>
            ) : null}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-textPrimary">{title}</h1>
          <p className="mx-auto mt-2 max-w-[34ch] text-sm text-textSecondary">{description}</p>
        </header>
        {children}
      </CardContent>
      {footer ? (
        <div className="border-t border-line bg-muted px-6 py-4 text-center text-sm text-textSecondary sm:px-8">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
