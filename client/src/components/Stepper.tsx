import { Check } from 'lucide-react';

export interface Step {
  id: string;
  title: string;
}

export function Stepper({ steps, currentIndex }: { steps: Step[]; currentIndex: number }) {
  const current = steps[currentIndex];

  return (
    <nav aria-label="Progress" className="mb-8">
      {/* Phones get the sentence; there is no room for a rail. */}
      <p className="text-sm font-medium text-muted sm:hidden">
        Step {currentIndex + 1} of {steps.length}
        {current ? <span className="text-ink"> · {current.title}</span> : null}
      </p>

      <ol className="hidden items-center gap-2 sm:flex">
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={step.id} className="flex flex-1 items-center gap-2">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? 'bg-ready text-white'
                    : active
                      ? 'bg-brand text-white'
                      : 'border border-line-strong text-muted'
                }`}
                aria-hidden
              >
                {done ? <Check size={14} strokeWidth={3} /> : index + 1}
              </span>
              <span
                className={`truncate text-sm ${active ? 'font-medium text-ink' : 'text-muted'}`}
                aria-current={active ? 'step' : undefined}
              >
                {step.title}
                {done ? <span className="sr-only"> (done)</span> : null}
              </span>
              {index < steps.length - 1 ? (
                <span className="h-px flex-1 bg-line" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
