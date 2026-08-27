import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import { useApp } from '../state/AppContext';

export const PROTOTYPE_DISCLOSURE =
  'Prototype for demonstration. Government services, documents, accounts and DigiLocker data shown here are simulated using synthetic data.';

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { resetDemo } = useApp();
  const [resetting, setResetting] = useState(false);
  const isPortalDemo = pathname.startsWith('/demo/');

  if (isPortalDemo) return <>{children}</>;

  const onHome = pathname === '/';

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5 text-ink">
            <span
              className="flex size-8 items-center justify-center rounded-lg bg-brand text-white"
              aria-hidden
            >
              <ShieldCheck size={18} />
            </span>
            <span className="font-display text-xl tracking-tight">Seva</span>
          </Link>
          <div className="flex items-center gap-2">
            {onHome ? null : (
              <button
                type="button"
                disabled={resetting}
                onClick={async () => {
                  setResetting(true);
                  try {
                    await resetDemo();
                    navigate('/');
                  } finally {
                    setResetting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted hover:border-brand hover:text-brand disabled:opacity-50"
              >
                <RotateCcw size={13} aria-hidden />
                {resetting ? 'Resetting…' : 'Reset demo'}
              </button>
            )}
            <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium text-muted">
              Prototype
            </span>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-3xl space-y-3 px-5 py-8 text-sm text-muted">
          <p>{PROTOTYPE_DISCLOSURE}</p>
          <p>
            Seva is an independent demonstration project. It is not affiliated with, endorsed
            by, or connected to any government body.
          </p>
          <p>
            <Link to="/demo/government-portal" className="underline hover:text-brand">
              See the future integration demo
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

/** One-line version for placing inside a screen. */
export function PrototypeNote({ text }: { text?: string }) {
  return (
    <p className="rounded-xl border border-line bg-paper px-4 py-3 text-sm text-muted">
      {text ?? PROTOTYPE_DISCLOSURE}
    </p>
  );
}
