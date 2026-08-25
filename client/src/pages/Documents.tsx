import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, PencilLine } from 'lucide-react';
import type { DocumentIssue, DocumentRequirement } from '@taiyaar/shared';
import { usePreparation } from '../lib/hooks';
import { useApp } from '../state/AppContext';
import {
  Button,
  Card,
  ErrorNotice,
  LoadingScreen,
  PageHeader,
  ProgressBar,
} from '../components/ui/Primitives';
import { Stepper } from '../components/Stepper';
import { useToast } from '../components/ui/Overlay';
import { DigiLockerBanner, RequirementCard } from '../features/documents/RequirementCard';
import { RequirementSheet } from '../features/documents/RequirementSheet';
import { UploadSheet } from '../features/documents/UploadSheet';
import { DocumentSheet } from '../features/documents/DocumentSheet';
import { IssueSheet } from '../features/documents/IssueSheet';
import { DigiLockerSheet } from '../features/digilocker/DigiLockerSheet';

const PREPARE_STEPS = [
  { id: 'details', title: 'About you' },
  { id: 'documents', title: 'Documents' },
  { id: 'readiness', title: 'Ready?' },
];

type SheetState =
  | { kind: 'why' | 'upload' | 'view'; requirementId: string }
  | { kind: 'issue'; issueId: string; requirementId: string }
  | { kind: 'digilocker' }
  | null;

export function Documents() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { session, refreshReadiness, resolveIssue } = useApp();
  const { service, readiness, loading, error, reload } = usePreparation(serviceId);
  const [sheet, setSheet] = useState<SheetState>(null);

  if (loading) return <LoadingScreen label="Checking your documents…" />;
  if (error) return <ErrorNotice message={error.message} action={error.action} onRetry={reload} />;
  if (!service || !readiness || !serviceId) return null;

  const documentItems = readiness.items.filter((item) => item.type === 'document');
  const requirementById = new Map(
    service.requirements
      .filter((r): r is DocumentRequirement => r.type === 'document')
      .map((r) => [r.id, r]),
  );
  const documentById = new Map((session?.documents ?? []).map((d) => [d.id, d]));
  const issueById = new Map((session?.issues ?? []).map((i) => [i.id, i]));

  const activeRequirement =
    sheet && 'requirementId' in sheet ? (requirementById.get(sheet.requirementId) ?? null) : null;
  const activeItem =
    sheet && 'requirementId' in sheet
      ? (documentItems.find((item) => item.requirementId === sheet.requirementId) ?? null)
      : null;
  const activeDocument = activeItem?.matchedDocumentId
    ? (documentById.get(activeItem.matchedDocumentId) ?? null)
    : null;
  const activeIssue =
    sheet?.kind === 'issue' ? (issueById.get(sheet.issueId) ?? null) : null;

  const chosenLockerIds = (session?.documents ?? [])
    .filter((d) => d.source === 'digilocker')
    .map((d) => d.id);

  const informationLeft = readiness.informationTotal - readiness.informationReady;

  async function refresh() {
    if (serviceId) await refreshReadiness(serviceId);
  }

  async function confirmIssue(issue: DocumentIssue) {
    await resolveIssue(issue.id);
    await refresh();
    toast('Confirmed. That item is cleared.');
  }

  return (
    <div className="pb-28 sm:pb-0">
      <Stepper steps={PREPARE_STEPS} currentIndex={1} />

      <PageHeader
        eyebrow={service.name}
        title="Your documents"
        description="Here is everything this application asks for, and what you already have."
      />

      <div className="mb-6">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="font-medium text-ink">
            {readiness.documentsReady} of {readiness.documentsTotal} ready
          </p>
          <p className="text-sm text-muted">{readiness.readinessPercentage}% prepared overall</p>
        </div>
        <ProgressBar
          value={(readiness.documentsReady / Math.max(1, readiness.documentsTotal)) * 100}
          label={`${readiness.documentsReady} of ${readiness.documentsTotal} documents ready`}
          tone={readiness.documentsReady === readiness.documentsTotal ? 'ready' : 'brand'}
        />
      </div>

      <div className="mb-6">
        <DigiLockerBanner
          connected={Boolean(session?.digiLockerConnected)}
          chosenCount={chosenLockerIds.length}
          onOpen={() => setSheet({ kind: 'digilocker' })}
        />
      </div>

      <ul className="space-y-4">
        {documentItems.map((item) => {
          const requirement = requirementById.get(item.requirementId);
          if (!requirement) return null;
          const issueId = item.issueIds[0];
          return (
            <RequirementCard
              key={item.requirementId}
              item={item}
              requirement={requirement}
              document={
                item.matchedDocumentId ? documentById.get(item.matchedDocumentId) : undefined
              }
              issue={issueId ? issueById.get(issueId) : undefined}
              onWhy={() => setSheet({ kind: 'why', requirementId: item.requirementId })}
              onUpload={() => setSheet({ kind: 'upload', requirementId: item.requirementId })}
              onView={() => setSheet({ kind: 'view', requirementId: item.requirementId })}
              onReview={() =>
                issueId
                  ? setSheet({ kind: 'issue', issueId, requirementId: item.requirementId })
                  : setSheet({ kind: 'view', requirementId: item.requirementId })
              }
            />
          );
        })}
      </ul>

      {informationLeft > 0 ? (
        <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 border-warn/40 bg-warn-soft p-5">
          <p className="text-ink">
            {informationLeft === 1
              ? 'One question about you is still unanswered.'
              : `${informationLeft} questions about you are still unanswered.`}
          </p>
          <Link to={`/prepare/${serviceId}/details`}>
            <Button variant="secondary" icon={<PencilLine size={16} aria-hidden />}>
              Answer them
            </Button>
          </Link>
        </Card>
      ) : null}

      {/* Sticky on phones so the way forward is always in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-4 backdrop-blur sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto max-w-3xl">
          <Button
            block
            icon={<ArrowRight size={18} aria-hidden />}
            onClick={() => navigate(`/prepare/${serviceId}/readiness`)}
          >
            See if I&rsquo;m ready
          </Button>
        </div>
      </div>

      <RequirementSheet
        open={sheet?.kind === 'why'}
        onClose={() => setSheet(null)}
        serviceId={serviceId}
        requirement={activeRequirement}
      />

      <UploadSheet
        open={sheet?.kind === 'upload'}
        onClose={() => setSheet(null)}
        serviceId={serviceId}
        requirement={activeRequirement}
        onUsed={async () => {
          await refresh();
          toast('Added to your checklist.');
        }}
      />

      <DocumentSheet
        open={sheet?.kind === 'view'}
        onClose={() => setSheet(null)}
        document={activeDocument}
        onReplace={
          activeItem
            ? () => setSheet({ kind: 'upload', requirementId: activeItem.requirementId })
            : undefined
        }
      />

      <IssueSheet
        open={sheet?.kind === 'issue'}
        onClose={() => setSheet(null)}
        serviceId={serviceId}
        issue={activeIssue}
        onConfirm={confirmIssue}
        onReplace={(issue) =>
          setSheet({
            kind: 'upload',
            requirementId: issue.requirementId ?? activeItem?.requirementId ?? '',
          })
        }
      />

      <DigiLockerSheet
        open={sheet?.kind === 'digilocker'}
        onClose={() => setSheet(null)}
        alreadyChosenIds={chosenLockerIds}
        onSelected={async () => {
          await refresh();
          toast('Documents added from your locker.');
        }}
      />
    </div>
  );
}
