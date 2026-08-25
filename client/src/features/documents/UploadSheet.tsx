import { useRef, useState } from 'react';
import { AlertTriangle, Check, Upload } from 'lucide-react';
import type { DocumentAnalysis, DocumentRequirement } from '@taiyaar/shared';
import { Sheet } from '../../components/ui/Overlay';
import { Button, Spinner } from '../../components/ui/Primitives';
import { useApp } from '../../state/AppContext';
import { ApiError } from '../../api/client';

type Stage = 'choose' | 'analysing' | 'result' | 'failed';

export function UploadSheet({
  open,
  onClose,
  serviceId,
  requirement,
  onUsed,
}: {
  open: boolean;
  onClose: () => void;
  serviceId: string;
  requirement: DocumentRequirement | null;
  onUsed: () => Promise<void>;
}) {
  const { uploadDocument } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('choose');
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [failure, setFailure] = useState<{ message: string; action: string } | null>(null);

  function reset() {
    setStage('choose');
    setFile(null);
    setAnalysis(null);
    setFailure(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function send(chosen: File) {
    if (!requirement) return;
    setFile(chosen);
    setStage('analysing');
    try {
      const result = await uploadDocument(serviceId, requirement.id, chosen);
      setAnalysis(result.analysis);
      setStage('result');
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? { message: error.message, action: error.action }
          : {
              message: 'We could not read that file.',
              action: 'Try a different file. Nothing else you prepared has changed.',
            },
      );
      setStage('failed');
    }
  }

  return (
    <Sheet
      open={open && requirement !== null}
      onClose={close}
      title={stage === 'result' ? 'Document received' : `Upload ${requirement?.title.toLowerCase()}`}
      subtitle={stage === 'choose' ? 'JPG, PNG or PDF, up to 5 MB' : undefined}
    >
      {stage === 'choose' ? (
        <div className="space-y-5">
          <p className="text-muted">
            Upload the file here so it is attached before you start the form. In this prototype the
            file is read once and then discarded — nothing is stored.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            onChange={(event) => {
              const chosen = event.target.files?.[0];
              if (chosen) void send(chosen);
            }}
          />

          <Button
            block
            icon={<Upload size={18} aria-hidden />}
            onClick={() => inputRef.current?.click()}
          >
            Choose a file
          </Button>

          {requirement ? (
            <div className="rounded-xl bg-paper p-4">
              <p className="text-sm font-medium text-ink">What works here</p>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {requirement.examples.map((example) => (
                  <li key={example}>• {example}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {stage === 'analysing' ? (
        <div className="space-y-3 py-4">
          <Spinner label="Reading your document…" />
          {file ? <p className="text-sm text-muted">{file.name}</p> : null}
        </div>
      ) : null}

      {stage === 'result' && analysis ? (
        <div className="space-y-5">
          <ul className="space-y-3">
            {analysis.checks.map((check) => (
              <li key={check.label} className="flex gap-3">
                <span
                  className={`mt-0.5 shrink-0 ${
                    check.status === 'warning' ? 'text-warn' : 'text-ready'
                  }`}
                  aria-hidden
                >
                  {check.status === 'warning' ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <Check size={18} strokeWidth={3} />
                  )}
                </span>
                <span>
                  <span className="block font-medium text-ink">
                    {check.label}
                    <span className="sr-only">
                      {check.status === 'warning' ? ' — needs review' : ' — passed'}
                    </span>
                  </span>
                  <span className="block text-sm text-muted">{check.detail}</span>
                </span>
              </li>
            ))}
          </ul>

          {analysis.needsReview ? (
            <p className="rounded-xl border border-warn/40 bg-warn-soft p-4 text-sm text-ink">
              We will flag this on your checklist so you can look at it before you start. It is not
              a problem yet — just something worth a second of your time now rather than a rejected
              application later.
            </p>
          ) : null}

          <Button
            block
            onClick={async () => {
              await onUsed();
              close();
            }}
          >
            Use this document
          </Button>
        </div>
      ) : null}

      {stage === 'failed' && failure ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-miss/30 bg-miss-soft p-4">
            <p className="font-medium text-miss">{failure.message}</p>
            <p className="mt-1 text-ink">{failure.action}</p>
          </div>
          <Button block variant="secondary" onClick={reset}>
            Try another file
          </Button>
        </div>
      ) : null}
    </Sheet>
  );
}
