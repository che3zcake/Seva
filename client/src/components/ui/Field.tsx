import { useId } from 'react';
import { Check } from 'lucide-react';

export interface FieldProps {
  /** Stable id so a failed validation can focus this control. */
  id?: string;
  label: string;
  inputType: 'text' | 'date' | 'textarea' | 'select' | 'number' | 'tel';
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  required?: boolean;
  helpText?: string;
  placeholder?: string;
  /** Shown under the field and announced to screen readers. */
  error?: string;
  /** True when this answer came from what the citizen already prepared. */
  prepared?: boolean;
}

const BASE =
  'w-full rounded-xl border bg-surface px-4 py-3 text-base text-ink placeholder:text-muted/70';

export function Field({
  id: providedId,
  label,
  inputType,
  value,
  onChange,
  options,
  required = false,
  helpText,
  placeholder,
  error,
  prepared = false,
}: FieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [helpText ? helpId : null, error ? errorId : null].filter(Boolean).join(' ');
  // A prepared answer looks different from one still waiting for you. That
  // difference is the whole point of having prepared.
  const border = error
    ? 'border-miss'
    : prepared
      ? 'border-ready/50 bg-ready-soft/40'
      : 'border-line-strong';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <label htmlFor={id} className="text-base font-medium text-ink">
          {label}
          {required ? null : <span className="ml-2 text-sm font-normal text-muted">(optional)</span>}
        </label>
        {prepared ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-ready-soft px-1.5 py-0.5 text-xs font-medium text-ready">
            <Check size={11} strokeWidth={3} aria-hidden />
            Already prepared
          </span>
        ) : null}
      </div>
      {helpText ? (
        <p id={helpId} className="mt-1 text-sm text-muted">
          {helpText}
        </p>
      ) : null}

      <div className="mt-2">
        {inputType === 'textarea' ? (
          <textarea
            id={id}
            value={value}
            rows={3}
            required={required}
            placeholder={placeholder}
            aria-describedby={describedBy || undefined}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onChange(event.target.value)}
            className={`${BASE} ${border} resize-y`}
          />
        ) : inputType === 'select' ? (
          <select
            id={id}
            value={value}
            required={required}
            aria-describedby={describedBy || undefined}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onChange(event.target.value)}
            className={`${BASE} ${border}`}
          >
            <option value="">Choose an option</option>
            {(options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            type={inputType}
            value={value}
            required={required}
            placeholder={placeholder}
            inputMode={inputType === 'number' ? 'numeric' : undefined}
            aria-describedby={describedBy || undefined}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onChange(event.target.value)}
            className={`${BASE} ${border}`}
          />
        )}
      </div>

      {error ? (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-miss">
          {error}
        </p>
      ) : null}
    </div>
  );
}
