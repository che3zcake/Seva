import { useEffect, useState } from 'react';
import { Check, FolderLock, ShieldCheck } from 'lucide-react';
import type { DigiLockerAccount, DigiLockerDocument } from '@seva/shared';
import { Sheet } from '../../components/ui/Overlay';
import { Badge, Button, Spinner } from '../../components/ui/Primitives';
import { useApp } from '../../state/AppContext';
import { ApiError } from '../../api/client';

type Stage = 'consent' | 'connecting' | 'documents' | 'failed';

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * A stand-in for the DigiLocker consent flow. Every screen here says so - the
 * point is to show what the step feels like, not to imitate the real thing
 * closely enough to be mistaken for it.
 */
export function DigiLockerSheet({
  open,
  onClose,
  onSelected,
  alreadyChosenIds,
}: {
  open: boolean;
  onClose: () => void;
  onSelected: () => Promise<void>;
  alreadyChosenIds: string[];
}) {
  const { session, connectDigiLocker, selectDigiLockerDocuments, removeDocument } = useApp();
  const [stage, setStage] = useState<Stage>(session?.digiLockerConnected ? 'documents' : 'consent');
  const [account, setAccount] = useState<DigiLockerAccount | null>(
    session?.digiLockerAccount ?? null,
  );
  const [documents, setDocuments] = useState<DigiLockerDocument[]>([]);
  const [picked, setPicked] = useState<string[]>(alreadyChosenIds);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<{ message: string; action: string } | null>(null);

  async function connect() {
    setStage('connecting');
    setFailure(null);
    try {
      const result = await connectDigiLocker();
      setAccount(result.account);
      setDocuments(result.documents);
      setPicked(result.documents.filter((d) => alreadyChosenIds.includes(d.id)).map((d) => d.id));
      setStage('documents');
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? { message: error.message, action: error.action }
          : {
              message: 'We could not connect to the simulated locker.',
              action: 'Your documents have not been changed. Try again.',
            },
      );
      setStage('failed');
    }
  }

  // Coming back to an already-connected locker starts at the document list with
  // nothing in it, because the list lives in component state and this component
  // remounts. Reconnecting is idempotent and instant, so just refill it.
  useEffect(() => {
    if (!open) return;
    setPicked(alreadyChosenIds);
    if (stage === 'documents' && documents.length === 0 && !saving) void connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setFailure(null);
    onClose();
  }

  async function save() {
    setSaving(true);
    setFailure(null);
    try {
      // Unticking has to actually remove, otherwise the checkbox lies.
      const dropped = alreadyChosenIds.filter((id) => !picked.includes(id));
      for (const id of dropped) await removeDocument(id);

      const added = picked.filter((id) => !alreadyChosenIds.includes(id));
      if (added.length > 0) await selectDigiLockerDocuments(added);

      await onSelected();
      onClose();
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? { message: error.message, action: error.action }
          : { message: 'We could not update those documents.', action: 'Try again.' },
      );
      setStage('failed');
    } finally {
      setSaving(false);
    }
  }

  const unchanged = sameSet(picked, alreadyChosenIds);
  const title =
    stage === 'documents'
      ? 'Your documents'
      : stage === 'failed'
        ? 'Connection failed'
        : 'Connect your DigiLocker';

  function actionLabel(): string {
    if (unchanged) return picked.length === 0 ? 'Select a document to continue' : 'No changes to save';
    if (picked.length === 0) return 'Remove all locker documents';
    return `Use ${picked.length} document${picked.length === 1 ? '' : 's'} for this application`;
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={title}
      subtitle={stage === 'documents' && account ? account.holderName : undefined}
      footer={
        stage === 'documents' ? (
          <Button block loading={saving} disabled={unchanged} onClick={save}>
            {actionLabel()}
          </Button>
        ) : undefined
      }
    >
      {stage === 'consent' ? (
        <div className="space-y-5">
          <div className="flex justify-center">
            <span
              className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"
              aria-hidden
            >
              <FolderLock size={26} />
            </span>
          </div>
          <p className="text-ink">
            This prototype will check whether you have documents that may be useful for this
            application.
          </p>
          <ul className="space-y-2 text-muted">
            <li className="flex gap-2">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
              Documents will only be shown to this prototype account.
            </li>
            <li className="flex gap-2">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
              Nothing is submitted or shared anywhere.
            </li>
          </ul>
          <p className="rounded-xl bg-paper p-4 text-sm text-muted">
            This is a simulation. No real DigiLocker account is contacted and every document you are
            about to see was invented for this demo.
          </p>
          <Button block onClick={connect}>
            Continue
          </Button>
        </div>
      ) : null}

      {stage === 'connecting' ? (
        <div className="py-8">
          <Spinner label="Opening the simulated locker…" />
        </div>
      ) : null}

      {stage === 'documents' ? (
        documents.length === 0 ? (
          <div className="py-8">
            <Spinner label="Loading your documents…" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Tick the documents you want to use. We will work out which requirements each one
              covers. Unticking one removes it from your checklist.
            </p>
            <ul className="space-y-3">
              {documents.map((document) => {
                const checked = picked.includes(document.id);
                return (
                  <li key={document.id}>
                    <label
                      className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
                        checked
                          ? 'border-brand bg-brand-soft/50'
                          : 'border-line hover:border-line-strong'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        className="mt-1 size-5 shrink-0 accent-[#0f5c4e]"
                        onChange={(event) =>
                          setPicked((current) =>
                            event.target.checked
                              ? [...current, document.id]
                              : current.filter((id) => id !== document.id),
                          )
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-ink">{document.name}</span>
                          {checked ? <Check size={16} className="text-brand" aria-hidden /> : null}
                        </span>
                        <span className="mt-0.5 block text-sm text-muted">
                          {document.description}
                        </span>
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          <Badge tone="info">Synthetic document</Badge>
                          <Badge tone="neutral">{document.digilockerRef}</Badge>
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )
      ) : null}

      {stage === 'failed' && failure ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-miss/30 bg-miss-soft p-4">
            <p className="font-medium text-miss">{failure.message}</p>
            <p className="mt-1 text-ink">{failure.action}</p>
          </div>
          <Button block onClick={connect}>
            Try again
          </Button>
        </div>
      ) : null}
    </Sheet>
  );
}
