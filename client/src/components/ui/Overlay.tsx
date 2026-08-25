import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';

/**
 * Built on the native <dialog> element, which gives modal semantics, Escape to
 * close, focus containment and an inert background without any of it being
 * hand-rolled. Bottom sheet on phones, centred panel from `sm` up.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // <dialog> fires `close` for programmatic closes too. Without this flag,
  // handing off from one sheet to another (Review -> Upload) closes the sheet
  // we just opened, because the outgoing sheet's close event clears the state
  // the incoming one depends on.
  const closingOurselves = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) {
      closingOurselves.current = true;
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={() => {
        if (closingOurselves.current) {
          closingOurselves.current = false;
          return;
        }
        onClose();
      }}
      onClick={(event) => {
        // Clicks land on the dialog itself only when they hit the backdrop.
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/50 sm:inset-0 sm:m-auto sm:max-h-[85vh] sm:w-[min(32rem,calc(100vw-2rem))] sm:rounded-2xl"
    >
      <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4">
        <div>
          <h2 id={titleId} className="text-xl">
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 rounded-lg p-2 text-muted hover:bg-paper hover:text-ink"
        >
          <X size={20} aria-hidden />
        </button>
      </div>
      <div className="px-5 py-5">{children}</div>
      {footer ? (
        <div className="sticky bottom-0 border-t border-line bg-surface px-5 py-4">{footer}</div>
      ) : null}
    </dialog>
  );
}

interface Toast {
  id: number;
  message: string;
  tone: 'ready' | 'info' | 'miss';
}

const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = useCallback((message: string, tone: Toast['tone'] = 'ready') => {
    const id = (nextId.current += 1);
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4000);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-40 z-40 flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm shadow-lg ${
              toast.tone === 'miss'
                ? 'bg-miss text-white'
                : toast.tone === 'info'
                  ? 'bg-info text-white'
                  : 'bg-ink text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
