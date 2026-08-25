import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark disabled:bg-line-strong disabled:text-muted',
  secondary:
    'bg-surface text-ink border border-line-strong hover:border-brand hover:text-brand disabled:opacity-50',
  ghost: 'text-brand hover:bg-brand-soft disabled:opacity-50',
  danger: 'bg-surface text-miss border border-miss/40 hover:bg-miss-soft',
};

/**
 * Shared so a react-router <Link> can *be* the button instead of wrapping one.
 * A <button> inside an <a> is invalid markup and gives keyboard users two tab
 * stops for one action.
 */
export function buttonClasses(variant: Variant = 'primary', block = false): string {
  return `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-medium transition-colors ${
    VARIANTS[variant]
  } ${block ? 'w-full' : ''}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  /** Renders full-width. Used for the primary action on small screens. */
  block?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  loading = false,
  block = false,
  icon,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      // 48px min height: comfortable to hit on a phone.
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-medium transition-colors disabled:cursor-not-allowed ${
        VARIANTS[variant]
      } ${block ? 'w-full' : ''} ${className}`}
    >
      {loading ? <Loader2 size={18} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  return (
    <Tag className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</Tag>
  );
}

type Tone = 'brand' | 'ready' | 'warn' | 'miss' | 'info' | 'neutral';

const TONES: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand-dark',
  ready: 'bg-ready-soft text-ready',
  warn: 'bg-warn-soft text-warn',
  miss: 'bg-miss-soft text-miss',
  info: 'bg-info-soft text-info',
  neutral: 'bg-paper text-muted border border-line',
};

export function Badge({
  tone = 'neutral',
  children,
  icon,
}: {
  tone?: Tone;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TONES[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  label,
  tone = 'brand',
}: {
  value: number;
  label: string;
  tone?: 'brand' | 'ready';
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-3 w-full overflow-hidden rounded-full bg-line"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${
          tone === 'ready' ? 'bg-ready' : 'bg-brand'
        }`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-8">
      {eyebrow ? (
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">{eyebrow}</p>
      ) : null}
      <h1 className="text-3xl leading-tight sm:text-4xl">{title}</h1>
      {description ? <p className="mt-3 text-lg text-muted">{description}</p> : null}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="p-8 text-center">
      {icon ? <div className="mb-3 flex justify-center text-muted">{icon}</div> : null}
      <h2 className="text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </Card>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-muted" role="status">
      <Loader2 size={20} className="animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

/** Skeleton for the first paint of a screen that is still fetching. */
export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="py-16">
      <Spinner label={label} />
    </div>
  );
}

export function ErrorNotice({
  message,
  action,
  onRetry,
}: {
  message: string;
  action: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-miss/30 bg-miss-soft p-5">
      <h2 className="text-lg text-miss">{message}</h2>
      <p className="mt-1 text-ink">{action}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Card>
  );
}
