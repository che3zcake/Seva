import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, ListChecks, Wrench } from 'lucide-react';
import { usePreparation } from '../lib/hooks';
import { useApp } from '../state/AppContext';
import { ApiError } from '../api/client';
import {
  Button,
  Card,
  ErrorNotice,
  LoadingScreen,
  ProgressBar,
} from '../components/ui/Primitives';
import { StatusIndicator } from '../components/ui/Status';
import { Stepper } from '../components/Stepper';

const PREPARE_STEPS = [
  { id: 'details', title: 'About you' },
  { id: 'documents', title: 'Documents' },
  { id: 'readiness', title: 'Ready?' },
];

export function Readiness() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { startApplication } = useApp();
  const { service, readiness, loading, error, reload } = usePreparation(serviceId);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<ApiError | null>(null);

  if (loading) return <LoadingScreen label="Working out where you stand…" />;
  if (error) return <ErrorNotice message={error.message} action={error.action} onRetry={reload} />;
  if (!service || !readiness || !serviceId) return null;

  const ready = readiness.readyToApply;

  async function begin() {
    if (!serviceId) return;
    setStarting(true);
    setStartError(null);
    try {
      await startApplication(serviceId);
      navigate(`/apply/${serviceId}`);
    } catch (caught) {
      setStartError(
        caught instanceof ApiError
          ? caught
          : new ApiError('We could not start the application.', 'Try again.', 'start'),
      );
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="pb-28 sm:pb-0">
      <Stepper steps={PREPARE_STEPS} currentIndex={2} />

      <p className="text-sm font-medium uppercase tracking-wide text-muted">{service.name}</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">
        {ready ? "You're ready to apply." : "You're not ready yet."}
      </h1>
      <p className="mt-3 text-lg text-muted">{readiness.summary}</p>

      {/* The verdict, stated once and unmistakably. */}
      <Card
        className={`mt-8 p-6 ${
          ready ? 'border-ready/40 bg-ready-soft' : 'border-warn/40 bg-warn-soft'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={ready ? 'text-ready' : 'text-warn'} aria-hidden>
            {ready ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
          </span>
          <p className="font-display text-2xl">
            {readiness.documentsReady} of {readiness.documentsTotal} documents ready
          </p>
        </div>

        <div className="mt-4">
          <ProgressBar
            value={readiness.readinessPercentage}
            label={`${readiness.readinessPercentage} percent prepared`}
            tone={ready ? 'ready' : 'brand'}
          />
          <p className="mt-2 text-sm text-muted">
            {readiness.satisfiedRequirements} of {readiness.totalRequirements} items complete ·{' '}
            {readiness.readinessPercentage}%
          </p>
        </div>

        {ready ? (
          <ul className="mt-5 space-y-2">
            <ReadyLine text="All required documents ready" />
            <ReadyLine text="All questions answered" />
            <ReadyLine text="No problems left to sort out" />
          </ul>
        ) : null}
      </Card>

      {readiness.blockingIssues.length > 0 ? (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-xl">
            <AlertTriangle size={20} className="text-warn" aria-hidden />
            {readiness.blockingIssues.length === 1
              ? '1 issue needs your attention'
              : `${readiness.blockingIssues.length} issues need your attention`}
          </h2>
          <ul className="mt-4 space-y-3">
            {readiness.blockingIssues.map((issue) => (
              <Card as="li" key={issue.id} className="border-warn/40 p-4">
                <p className="font-medium text-ink">{issue.title}</p>
                <p className="mt-1 text-sm text-muted">{issue.detail}</p>
              </Card>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-xl">
          <ListChecks size={20} className="text-brand" aria-hidden />
          Everything this asks for
        </h2>
        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
          {readiness.items.map((item) => (
            <li key={item.requirementId} className="flex items-start gap-3 px-4 py-3.5">
              <span className="mt-0.5">
                <StatusIndicator status={item.status} showLabel={false} size="sm" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">{item.title}</span>
                <span className="block text-sm text-muted">{item.reason}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {!ready && readiness.recommendations.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl">What is left</h2>
          <ol className="mt-3 space-y-2">
            {readiness.recommendations.map((recommendation, index) => (
              <li key={recommendation} className="flex gap-3 text-ink">
                <span className="shrink-0 text-muted" aria-hidden>
                  {index + 1}.
                </span>
                {recommendation}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {startError ? (
        <div className="mt-6">
          <ErrorNotice message={startError.message} action={startError.action} />
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-4 backdrop-blur sm:static sm:mt-10 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto max-w-3xl">
          {ready ? (
            <Button block loading={starting} icon={<ArrowRight size={18} aria-hidden />} onClick={begin}>
              Start application
            </Button>
          ) : (
            <Button
              block
              icon={<Wrench size={18} aria-hidden />}
              onClick={() => navigate(`/prepare/${serviceId}/documents`)}
            >
              Fix remaining items
            </Button>
          )}
        </div>
      </div>

      {!ready ? (
        <p className="mt-4 text-center text-sm text-muted sm:mt-4">
          The application stays closed until everything above is sorted. That is the point.
        </p>
      ) : null}
    </div>
  );
}

function ReadyLine({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 text-ink">
      <CheckCircle2 size={18} className="shrink-0 text-ready" aria-hidden />
      {text}
    </li>
  );
}
