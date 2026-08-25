import type { Document } from '@taiyaar/shared';
import { Sheet } from '../../components/ui/Overlay';
import { Badge, Button } from '../../components/ui/Primitives';

const SOURCE_LABEL: Record<Document['source'], string> = {
  digilocker: 'Retrieved from DigiLocker',
  'user-upload': 'Uploaded by you',
  'mock-system': 'Added by the prototype',
};

export function DocumentSheet({
  open,
  onClose,
  document,
  onReplace,
}: {
  open: boolean;
  onClose: () => void;
  document: Document | null;
  onReplace?: () => void;
}) {
  const rows: [string, string][] = document
    ? [
        ['Issued by', document.issuer],
        ...(document.metadata.holderName ? [['Name on document', document.metadata.holderName] as [string, string]] : []),
        ...(document.metadata.documentNumber
          ? [['Reference', document.metadata.documentNumber] as [string, string]]
          : []),
        ...(document.metadata.issuedOn ? [['Issued on', document.metadata.issuedOn] as [string, string]] : []),
        ...(document.metadata.address ? [['Address', document.metadata.address] as [string, string]] : []),
        ...Object.entries(document.metadata.extra ?? {}),
      ]
    : [];

  return (
    <Sheet
      open={open && document !== null}
      onClose={onClose}
      title={document?.name ?? ''}
      subtitle={document ? SOURCE_LABEL[document.source] : undefined}
    >
      {document ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">Synthetic document</Badge>
            <Badge tone="neutral">Available for this prototype</Badge>
          </div>

          <dl className="divide-y divide-line rounded-xl border border-line">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="text-sm text-muted">
            This record was made up for the demonstration. No real document was retrieved and no
            real account was contacted.
          </p>

          {onReplace ? (
            <Button
              variant="secondary"
              block
              onClick={() => {
                onReplace();
                onClose();
              }}
            >
              Use a different document
            </Button>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}
