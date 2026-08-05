'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AuthSubmitProps = {
  pending: boolean;
  /** What the button says while the request is in flight. */
  pendingLabel: string;
  children: ReactNode;
};

/**
 * The primary action of an auth screen. The label names the action and keeps
 * the same verb the resulting toast uses.
 */
export default function AuthSubmit({ pending, pendingLabel, children }: AuthSubmitProps) {
  return (
    <Button type="submit" disabled={pending} className="h-11 w-full text-sm font-semibold">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
