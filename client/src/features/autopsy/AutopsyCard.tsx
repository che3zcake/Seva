import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, HelpCircle, Wrench } from 'lucide-react';
import type { RejectionAutopsy, RejectionFinding, ServiceDefinition } from '@seva/shared';
import { Button, Card } from '../../components/ui/Primitives';
import { useApp } from '../../state/AppContext';
import { ApiError } from '../../api/client';

/**
 * The product's central claim, on one card: if you applied right now, this is
 * the first place this simulated journey stops, and this is the shortest way
 * past it.
 *
 * Every string here is scoped to the prototype's own configured checklist. It
 * never says a government would reject anything, because it does not know that.
 */
export function AutopsyCard({
  service,
  autopsy,
  onChanged,
}: {
  service: ServiceDefinition;
  autopsy: RejectionAutopsy;
  onChanged: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const { addSampleDocument, resolveIssue, startApplication } = useApp();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [showRest, setShowRest] = useState(false);

  const first = autopsy.firstFailure;
  const later = autopsy.findings.slice(1);

  async function fix(finding: RejectionFinding) {
    setBusy(true);
    setFailure(null);
    try {
      if (finding.issueId) {
        await resolveIssue(finding.issueId);
      } else {
        const requirement = service.requirements.find((r) => r.id === finding.requirementId);
        if (requirement?.type === 'information') {
          navigate(`/prepare/${service.id}/details`);
          return;
        }
        await addSampleDocument(service.id, finding.requirementId);
      }
      await onChanged();
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? `${error.message} ${error.action}`
          : 'That did not work. Nothing has changed — try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  /**
   * The application has to be *started* server-side before /apply has anything
   * to render - it redirects back here otherwise. The server re-checks
   * readiness at this point too, so this is also the real gate.
   */
  async function continueToForm() {
    setBusy(true);
    setFailure(null);
    try {
      await startApplication(service.id);
      navigate(`/apply/${service.id}`);
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? `${error.message} ${error.action}`
          : 'We could not open the application. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  function fixLabel(finding: RejectionFinding): string {
    if (finding.issueId) return 'Confirm this is me';
    const requirement = service.requirements.find((r) => r.id === finding.requirementId);
    if (requirement?.type === 'information') return 'Answer this';
    return 'Fix this first';
  }

  // ------------------------------------------------------------- cleared ----
  if (autopsy.clear) {
    return (
      <Card className="border-ready/40 bg-ready-soft p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-ready" aria-hidden>
            <CheckCircle2 size={28} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-2xl leading-tight">No configured blocker remains</h2>
            <p className="mt-1 text-muted">Ready to rehearse the application.</p>
          </div>
        </div>
        <div className="mt-5">
          <Button
            block
            loading={busy}
            icon={<ArrowRight size={18} aria-hidden />}
            onClick={continueToForm}
          >
            Continue to mock form
          </Button>
        </div>
        {failure ? (
          <p className="mt-4 rounded-xl border border-miss/30 bg-miss-soft p-3 text-sm text-ink">
            {failure}
          </p>
        ) : null}
        <Provenance autopsy={autopsy} />
      </Card>
    );
  }

  // ----------------------------------------- unsettled, but no rule for it ---
  if (!first) {
    return (
      <Card className="border-line p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-muted" aria-hidden>
            <HelpCircle size={26} />
          </span>
          <div>
            <h2 className="font-display text-xl leading-tight">Preview unavailable</h2>
            <p className="mt-1 text-muted">
              {autopsy.unmappedRequirementIds.length === 1
                ? 'One item is still open, and this prototype has no configured stop for it.'
                : `${autopsy.unmappedRequirementIds.length} items are still open, and this prototype has no configured stop for them.`}{' '}
              Rather than guess, we are not showing one.
            </p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => navigate(`/prepare/${service.id}/documents`)}
            >
              Open the checklist
            </Button>
          </div>
        </div>
        <Provenance autopsy={autopsy} />
      </Card>
    );
  }

  // ------------------------------------------------------------ first stop ---
  return (
    <Card className="border-warn/40 bg-warn-soft p-6">
      <p className="text-sm font-medium uppercase tracking-wide text-warn">If you applied now</p>

      <div className="mt-3 flex items-start gap-3">
        <span className="mt-1 shrink-0 text-warn" aria-hidden>
          <AlertTriangle size={26} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight">
            This simulated journey would first stop at {first.requirementTitle.toLowerCase()}
          </h2>
          <p className="mt-1 text-sm font-medium text-ink">At: {first.mockStepTitle}</p>
        </div>
      </div>

      <p className="mt-4 text-ink">{first.simulatedMessage}</p>

      {first.fixSteps.length > 0 ? (
        <div className="mt-4 rounded-xl bg-surface/70 p-4">
          <p className="text-sm font-semibold text-ink">Shortest way past it</p>
          <p className="mt-1 text-sm text-muted">{first.fixSteps[0]}</p>
        </div>
      ) : null}

      {failure ? (
        <p className="mt-4 rounded-xl border border-miss/30 bg-miss-soft p-3 text-sm text-ink">
          {failure}
        </p>
      ) : null}

      <div className="mt-5">
        <Button
          block
          loading={busy}
          icon={<Wrench size={18} aria-hidden />}
          onClick={() => fix(first)}
        >
          {fixLabel(first)}
        </Button>
      </div>

      {later.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowRest((open) => !open)}
            className="text-sm font-medium text-brand underline"
            aria-expanded={showRest}
          >
            {showRest ? 'Hide' : 'Show'} {later.length} later configured{' '}
            {later.length === 1 ? 'stop' : 'stops'}
          </button>
          {showRest ? (
            <ul className="mt-3 space-y-2">
              {later.map((finding) => (
                <li key={finding.ruleId} className="text-sm text-muted">
                  <span className="font-medium text-ink">{finding.requirementTitle}</span> — at{' '}
                  {finding.mockStepTitle}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Provenance autopsy={autopsy} />
    </Card>
  );
}

function Provenance({ autopsy }: { autopsy: RejectionAutopsy }) {
  return (
    <p className="mt-5 border-t border-line/60 pt-4 text-xs text-muted">
      {autopsy.disclaimer} Checklist <code>{autopsy.rulesetVersion}</code>.
    </p>
  );
}
