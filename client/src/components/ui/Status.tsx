import { AlertTriangle, Check, Circle } from 'lucide-react';
import type { ReadinessStatus } from '@taiyaar/shared';

/**
 * Status is never communicated by colour alone: every indicator carries an
 * icon and a written label as well.
 */
export const STATUS_META: Record<
  ReadinessStatus,
  { label: string; tone: 'ready' | 'warn' | 'miss'; ring: string; text: string; bg: string }
> = {
  ready: {
    label: 'Ready',
    tone: 'ready',
    ring: 'border-ready/30',
    text: 'text-ready',
    bg: 'bg-ready-soft',
  },
  'needs-review': {
    label: 'Needs review',
    tone: 'warn',
    ring: 'border-warn/40',
    text: 'text-warn',
    bg: 'bg-warn-soft',
  },
  missing: {
    label: 'Missing',
    tone: 'miss',
    ring: 'border-miss/30',
    text: 'text-miss',
    bg: 'bg-miss-soft',
  },
};

export function StatusIndicator({
  status,
  showLabel = true,
  size = 'md',
}: {
  status: ReadinessStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}) {
  const meta = STATUS_META[status];
  const dimension = size === 'sm' ? 20 : 26;
  const iconSize = size === 'sm' ? 12 : 15;

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`flex shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.text}`}
        style={{ width: dimension, height: dimension }}
        aria-hidden
      >
        {status === 'ready' ? (
          <Check size={iconSize} strokeWidth={3} />
        ) : status === 'needs-review' ? (
          <AlertTriangle size={iconSize} strokeWidth={2.5} />
        ) : (
          <Circle size={iconSize} strokeWidth={2.5} />
        )}
      </span>
      {showLabel ? (
        <span className={`text-sm font-medium ${meta.text}`}>{meta.label}</span>
      ) : (
        <span className="sr-only">{meta.label}</span>
      )}
    </span>
  );
}
