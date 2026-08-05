import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type AuthNoticeProps = {
  tone: 'success' | 'error';
  title: string;
  description: string;
  /** The way forward. An end state without an action is a dead end. */
  children: ReactNode;
};

const TONES = {
  success: { Icon: CheckCircle2, wrap: 'bg-successBg text-success' },
  error: { Icon: AlertTriangle, wrap: 'bg-errorBg text-error' },
} as const;

/**
 * Terminal state of an auth flow, on the same card as the form it replaces so
 * the page keeps its shape when the screen switches.
 */
export default function AuthNotice({ tone, title, description, children }: AuthNoticeProps) {
  const { Icon, wrap } = TONES[tone];

  return (
    <Card className="overflow-hidden rounded-modal border-line bg-background shadow-cardHover">
      <CardContent className="p-6 text-center sm:p-8">
        <div className={cn('mx-auto flex h-12 w-12 items-center justify-center rounded-full', wrap)}>
          <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-textPrimary">{title}</h1>
        <p className="mx-auto mt-2 max-w-[38ch] text-sm text-textSecondary">{description}</p>
        <div className="mt-6">{children}</div>
      </CardContent>
    </Card>
  );
}
