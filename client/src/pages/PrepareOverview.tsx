import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, FileText, MessageSquareText } from 'lucide-react';
import { usePreparation } from '../lib/hooks';
import {
  Button,
  Card,
  ErrorNotice,
  LoadingScreen,
  PageHeader,
} from '../components/ui/Primitives';
import { PrototypeNote } from '../components/Layout';

export function PrepareOverview() {
  const { serviceId } = useParams();
  const { service, readiness, loading, error, reload } = usePreparation(serviceId);

  if (loading) return <LoadingScreen label="Working out what this needs…" />;
  if (error) return <ErrorNotice message={error.message} action={error.action} onRetry={reload} />;
  if (!service || !readiness) return null;

  const documentsChecked = readiness.documentsReady > 0 || readiness.needsReview > 0;
  const informationDone = readiness.informationReady === readiness.informationTotal;
  const openIssues = readiness.blockingIssues.length;

  const next = informationDone
    ? { to: `/prepare/${service.id}/documents`, label: 'Check my documents' }
    : { to: `/prepare/${service.id}/details`, label: 'Answer a few questions first' };

  return (
    <div>
      <PageHeader
        eyebrow={service.name}
        title="Before you start"
        description="Let's make sure you have everything you need."
      />

      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="text-brand" aria-hidden>
              <FileText size={20} />
            </span>
            <h2 className="text-lg">Documents</h2>
          </div>
          <p className="mt-2 text-muted">
            {service.name} asks for {readiness.documentsTotal} documents.
          </p>
          {documentsChecked ? (
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Stat label="ready" value={readiness.documentsReady} tone="text-ready" />
              <Stat label="need review" value={readiness.needsReview} tone="text-warn" />
              <Stat
                label="missing"
                value={readiness.missingRequirements.filter((i) => i.type === 'document').length}
                tone="text-miss"
              />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted">
              We haven&rsquo;t checked yet — that happens in the next step.
            </p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="text-brand" aria-hidden>
              <MessageSquareText size={20} />
            </span>
            <h2 className="text-lg">Information</h2>
          </div>
          <p className="mt-2 text-muted">
            {readiness.informationTotal} questions about you and why you need this.
          </p>
          <p className="mt-3 text-sm font-medium text-ink">
            {readiness.informationReady} of {readiness.informationTotal} answered
          </p>
        </Card>

        <Card className={`p-5 ${openIssues > 0 ? 'border-warn/40 bg-warn-soft' : ''}`}>
          <div className="flex items-center gap-3">
            <span className={openIssues > 0 ? 'text-warn' : 'text-brand'} aria-hidden>
              <AlertTriangle size={20} />
            </span>
            <h2 className="text-lg">Possible problems</h2>
          </div>
          <p className="mt-2 text-muted">
            {openIssues === 0
              ? 'Nothing to review so far. We check your documents against your answers as you go.'
              : openIssues === 1
                ? 'One thing needs your attention before you start.'
                : `${openIssues} things need your attention before you start.`}
          </p>
        </Card>
      </div>

      <div className="mt-8">
        <Link to={next.to}>
          <Button block icon={<ArrowRight size={18} aria-hidden />}>
            {next.label}
          </Button>
        </Link>
      </div>

      <div className="mt-8">
        <PrototypeNote text={service.prototypeNotice} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-paper py-3">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className={`block font-display text-2xl ${tone}`}>{value}</span>
        <span className="block text-xs text-muted">{label}</span>
      </dd>
    </div>
  );
}
