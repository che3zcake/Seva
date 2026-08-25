import { FolderLock, HelpCircle, Upload, Eye, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Document, DocumentIssue, DocumentRequirement, ReadinessItem } from '@taiyaar/shared';
import { Badge, Button, Card } from '../../components/ui/Primitives';
import { StatusIndicator, STATUS_META } from '../../components/ui/Status';

const SOURCE_BADGE: Record<Document['source'], string> = {
  digilocker: 'Retrieved from DigiLocker',
  'user-upload': 'Uploaded by you',
  'mock-system': 'Added by the prototype',
};

export function RequirementCard({
  item,
  requirement,
  document,
  issue,
  onWhy,
  onUpload,
  onView,
  onReview,
}: {
  item: ReadinessItem;
  requirement: DocumentRequirement;
  document?: Document;
  issue?: DocumentIssue;
  onWhy: () => void;
  onUpload: () => void;
  onView: () => void;
  onReview: () => void;
}) {
  const meta = STATUS_META[item.status];

  return (
    <Card as="li" className={`overflow-hidden ${item.status === 'missing' ? meta.ring : ''}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5">
              <StatusIndicator status={item.status} showLabel={false} />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg leading-snug">{item.title}</h3>
              <p className="mt-0.5 text-sm text-muted">{item.reason}</p>
            </div>
          </div>
          <span className={`shrink-0 text-sm font-medium ${meta.text}`}>{meta.label}</span>
        </div>

        {document ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-paper px-3 py-2.5">
            <span className="font-medium text-ink">{document.name}</span>
            <Badge tone="neutral">{SOURCE_BADGE[document.source]}</Badge>
            <Badge tone="info">Synthetic</Badge>
          </div>
        ) : null}

        {issue ? (
          <div className="mt-4 flex gap-2.5 rounded-xl border border-warn/40 bg-warn-soft px-3 py-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
            <p className="text-sm text-ink">{issue.title}</p>
          </div>
        ) : null}

        {/* A missing requirement is the moment that matters most, so it opens
            itself out instead of hiding the detail behind another tap. */}
        {item.status === 'missing' ? (
          <div className="mt-4 space-y-4 rounded-xl bg-paper p-4">
            <div>
              <p className="text-sm font-semibold text-ink">What might help</p>
              <ul className="mt-1.5 space-y-1 text-sm text-muted">
                {requirement.examples.map((example) => (
                  <li key={example}>• {example}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">What to do next</p>
              <ol className="mt-1.5 space-y-1 text-sm text-muted">
                {requirement.resolutionGuidance.map((step, index) => (
                  <li key={step}>
                    {index + 1}. {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line bg-surface px-5 py-3">
        {item.status === 'missing' ? (
          <Button variant="primary" icon={<Upload size={16} aria-hidden />} onClick={onUpload}>
            Upload document
          </Button>
        ) : null}

        {item.status === 'needs-review' ? (
          <Button variant="primary" icon={<Eye size={16} aria-hidden />} onClick={onReview}>
            Review this
          </Button>
        ) : null}

        {item.status === 'ready' && document ? (
          <Button variant="secondary" icon={<Eye size={16} aria-hidden />} onClick={onView}>
            View
          </Button>
        ) : null}

        {item.status !== 'missing' ? (
          <Button variant="secondary" icon={<RefreshCw size={16} aria-hidden />} onClick={onUpload}>
            Replace
          </Button>
        ) : null}

        <Button variant="ghost" icon={<HelpCircle size={16} aria-hidden />} onClick={onWhy}>
          Why do I need this?
        </Button>
      </div>
    </Card>
  );
}

export function DigiLockerBanner({
  connected,
  onOpen,
  chosenCount,
}: {
  connected: boolean;
  onOpen: () => void;
  chosenCount: number;
}) {
  return (
    <Card className={`p-5 ${connected ? '' : 'border-brand/30 bg-brand-soft/40'}`}>
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"
          aria-hidden
        >
          <FolderLock size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg">
            {connected ? 'Your DigiLocker is connected' : 'Check what you already have'}
          </h2>
          <p className="mt-1 text-muted">
            {connected
              ? `${chosenCount} document${chosenCount === 1 ? '' : 's'} pulled in so far. You can add or change them any time.`
              : 'Most people already have some of these saved. Connect and we will check for you.'}
          </p>
          <div className="mt-4">
            <Button variant={connected ? 'secondary' : 'primary'} onClick={onOpen}>
              {connected ? 'Review locker documents' : 'Connect DigiLocker'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
