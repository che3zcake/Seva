import { useState } from 'react';
import { AlertTriangle, Check, Sparkles } from 'lucide-react';
import type { AIExplanation, DocumentIssue } from '@taiyaar/shared';
import { Sheet } from '../../components/ui/Overlay';
import { Button, Spinner } from '../../components/ui/Primitives';
import { AIAnswer } from '../assistant/AIAnswer';
import { askQuestion } from '../../lib/ai';
import { ApiError } from '../../api/client';

export function IssueSheet({
  open,
  onClose,
  serviceId,
  issue,
  onConfirm,
  onReplace,
}: {
  open: boolean;
  onClose: () => void;
  serviceId: string;
  issue: DocumentIssue | null;
  onConfirm: (issue: DocumentIssue) => Promise<void>;
  onReplace: (issue: DocumentIssue) => void;
}) {
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  function close() {
    setExplanation(null);
    setFailed(null);
    onClose();
  }

  async function explain() {
    if (!issue) return;
    setLoading(true);
    setFailed(null);
    try {
      setExplanation(
        await askQuestion({
          serviceId,
          context: 'reviewing a possible problem with a document',
          question: `Why is the name on my ${issue.documentName} different, and what should I do?`,
          relevantRequirement: issue.requirementId,
        }),
      );
    } catch (error) {
      setFailed(
        error instanceof ApiError
          ? error.action
          : 'The explanation service is unavailable. The description above still applies.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet
      open={open && issue !== null}
      onClose={close}
      title={issue?.title ?? ''}
      subtitle={issue?.documentName}
    >
      {issue ? (
        <div className="space-y-5">
          <div className="flex gap-3 rounded-xl border border-warn/40 bg-warn-soft p-4">
            <span className="mt-0.5 shrink-0 text-warn" aria-hidden>
              <AlertTriangle size={20} />
            </span>
            <p className="text-ink">{issue.detail}</p>
          </div>

          {explanation ? <AIAnswer explanation={explanation} /> : null}
          {loading ? <Spinner label="Writing an explanation…" /> : null}
          {failed ? <p className="text-sm text-muted">{failed}</p> : null}

          {!explanation && !loading ? (
            <Button variant="ghost" icon={<Sparkles size={16} aria-hidden />} onClick={explain}>
              Explain this to me
            </Button>
          ) : null}

          <div className="space-y-3 border-t border-line pt-5">
            {issue.resolvable ? (
              <>
                <p className="font-medium text-ink">{issue.resolutionPrompt}</p>
                <Button
                  block
                  loading={confirming}
                  icon={<Check size={18} aria-hidden />}
                  onClick={async () => {
                    setConfirming(true);
                    try {
                      await onConfirm(issue);
                      close();
                    } finally {
                      setConfirming(false);
                    }
                  }}
                >
                  Yes, that is me
                </Button>
              </>
            ) : (
              <p className="font-medium text-ink">
                This one cannot be confirmed away — the document needs to be in your own name.
              </p>
            )}

            <Button
              variant="secondary"
              block
              onClick={() => {
                // Hand off, do NOT close: onReplace switches which sheet is
                // open, and calling onClose after it would clear that choice.
                setExplanation(null);
                setFailed(null);
                onReplace(issue);
              }}
            >
              Use a different document instead
            </Button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
