import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircleQuestion, SendHorizonal } from 'lucide-react';
import type { AIExplanation } from '@seva/shared';
import { Sheet } from '../../components/ui/Overlay';
import { Button, Spinner } from '../../components/ui/Primitives';
import { AIAnswer } from './AIAnswer';
import { askQuestion } from '../../lib/ai';
import { ApiError } from '../../api/client';

const SUGGESTIONS = [
  'What does "purpose of application" mean?',
  'Why do I need income proof?',
  'Is this a real government service?',
];

/** Turns the current route into something the assistant can reason about. */
function describeContext(pathname: string): { serviceId: string; context: string } {
  const match = pathname.match(/\/(?:prepare|apply)\/([^/]+)/);
  const serviceId = match?.[1] ?? 'income-certificate';

  if (pathname.includes('/documents')) return { serviceId, context: 'the document checklist' };
  if (pathname.includes('/readiness')) return { serviceId, context: 'the readiness summary' };
  if (pathname.includes('/details')) return { serviceId, context: 'answering questions about themselves' };
  if (pathname.startsWith('/apply')) return { serviceId, context: 'filling in the application form' };
  if (pathname.startsWith('/services')) return { serviceId, context: 'choosing a service' };
  return { serviceId, context: 'the start of the journey' };
}

interface Exchange {
  question: string;
  answer: AIExplanation | null;
  failed?: string;
}

export function Assistant() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [history, setHistory] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);

  // Not on the fictional portal, and not on the landing page - there is no
  // journey to ask about yet, and a floating pill there sits on top of the
  // synthetic-data disclosure, which is the one thing that must stay readable.
  if (pathname.startsWith('/demo/') || pathname === '/') return null;

  const { serviceId, context } = describeContext(pathname);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setDraft('');
    setHistory((current) => [...current, { question, answer: null }]);
    setLoading(true);

    try {
      const answer = await askQuestion({ serviceId, question, context });
      setHistory((current) =>
        current.map((entry, index) =>
          index === current.length - 1 ? { ...entry, answer } : entry,
        ),
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.action
          : 'Help is unavailable right now. Everything on your checklist still works.';
      setHistory((current) =>
        current.map((entry, index) =>
          index === current.length - 1 ? { ...entry, failed: message } : entry,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Need help?"
        className="fixed bottom-24 right-4 z-40 inline-flex size-12 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-lg hover:border-brand hover:text-brand sm:bottom-6 sm:size-auto sm:gap-2 sm:px-4 sm:py-3 sm:text-sm sm:font-medium"
      >
        <MessageCircleQuestion size={20} aria-hidden />
        <span className="hidden sm:inline">Need help?</span>
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Need help?"
        subtitle="Ask about anything on this screen"
        footer={
          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              void ask(draft);
            }}
            className="flex gap-2"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Your question
            </label>
            <input
              id="assistant-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type your question"
              className="min-h-12 flex-1 rounded-xl border border-line-strong bg-surface px-4 py-3 text-base"
            />
            <Button type="submit" disabled={!draft.trim() || loading} aria-label="Send question">
              <SendHorizonal size={18} aria-hidden />
            </Button>
          </form>
        }
      >
        <div className="space-y-5">
          {history.length === 0 ? (
            <div>
              <p className="text-muted">
                This helper explains what is on your checklist. It cannot add requirements or change
                them — those come from the service itself.
              </p>
              <ul className="mt-4 space-y-2">
                {SUGGESTIONS.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onClick={() => void ask(suggestion)}
                      className="w-full rounded-xl border border-line px-4 py-3 text-left text-ink hover:border-brand hover:text-brand"
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {history.map((entry, index) => (
            <div key={`${entry.question}-${index}`} className="space-y-3">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-white">
                {entry.question}
              </p>
              {entry.answer ? <AIAnswer explanation={entry.answer} /> : null}
              {entry.failed ? (
                <p className="rounded-xl border border-line bg-paper p-4 text-sm text-muted">
                  {entry.failed}
                </p>
              ) : null}
              {!entry.answer && !entry.failed && loading ? (
                <Spinner label="Thinking…" />
              ) : null}
            </div>
          ))}
        </div>
      </Sheet>
    </>
  );
}
