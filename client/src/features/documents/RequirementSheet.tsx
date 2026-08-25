import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { AIExplanation, DocumentRequirement } from '@taiyaar/shared';
import { Sheet } from '../../components/ui/Overlay';
import { Button, Spinner } from '../../components/ui/Primitives';
import { AIAnswer } from '../assistant/AIAnswer';
import { explainRequirement } from '../../lib/ai';
import { ApiError } from '../../api/client';

/** "Why do I need this?" and "How do I get this?" in one panel. */
export function RequirementSheet({
  open,
  onClose,
  serviceId,
  requirement,
}: {
  open: boolean;
  onClose: () => void;
  serviceId: string;
  requirement: DocumentRequirement | null;
}) {
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  function close() {
    setExplanation(null);
    setFailed(null);
    onClose();
  }

  async function ask() {
    if (!requirement) return;
    setLoading(true);
    setFailed(null);
    try {
      setExplanation(await explainRequirement(serviceId, requirement.id));
    } catch (error) {
      setFailed(
        error instanceof ApiError
          ? error.action
          : 'The explanation service is unavailable right now. What you see above still applies.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet
      open={open && requirement !== null}
      onClose={close}
      title={requirement?.title ?? ''}
      subtitle="Why this is needed, and what to do if you do not have it"
    >
      {requirement ? (
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Why this is needed
            </h3>
            <p className="mt-2 text-ink">{requirement.explanation}</p>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              What can be used here
            </h3>
            <ul className="mt-2 space-y-1.5">
              {requirement.examples.map((example) => (
                <li key={example} className="flex gap-2 text-ink">
                  <span aria-hidden className="text-brand">
                    •
                  </span>
                  {example}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">
              Any one of these may satisfy this requirement in this prototype. Whether a real office
              accepts it is not something this demo can tell you.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              How to get it
            </h3>
            <ol className="mt-2 space-y-2">
              {requirement.resolutionGuidance.map((step, index) => (
                <li key={step} className="flex gap-3 text-ink">
                  <span className="shrink-0 text-muted" aria-hidden>
                    {index + 1}.
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          {explanation ? <AIAnswer explanation={explanation} /> : null}
          {loading ? <Spinner label="Writing an explanation…" /> : null}
          {failed ? <p className="text-sm text-muted">{failed}</p> : null}

          {!explanation && !loading ? (
            <Button
              variant="secondary"
              icon={<Sparkles size={16} aria-hidden />}
              onClick={ask}
              block
            >
              Explain this in simpler words
            </Button>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}
