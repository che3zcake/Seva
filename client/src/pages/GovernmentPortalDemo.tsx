import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ExternalLink, ShieldCheck, X } from 'lucide-react';
import type { ReadinessItem, ReadinessResult } from '@taiyaar/shared';
import { apiSend } from '../api/client';
import { StatusIndicator } from '../components/ui/Status';
import { Button, Spinner } from '../components/ui/Primitives';

/**
 * A fictional portal, invented for this demo. It deliberately does not
 * resemble any real government website - it exists to show what an embedded
 * readiness panel would look like on top of an application people already use.
 */
const PAGE_REQUIREMENTS = [
  { label: 'Identity proof', hint: 'Attach a scanned copy' },
  { label: 'Address proof', hint: 'Attach a scanned copy' },
  { label: 'Date of birth proof', hint: 'Attach a scanned copy' },
  { label: 'Income proof', hint: 'Attach a scanned copy' },
  { label: 'Passport-size photograph', hint: 'JPEG only' },
  { label: 'Caste certificate', hint: 'If applicable' },
];

interface FromPageResponse {
  readiness: ReadinessResult;
  matched: { detected: string; item: ReadinessItem | null }[];
  unmatched: string[];
}

export function GovernmentPortalDemo() {
  return (
    <div className="min-h-screen bg-[#eef1f4] text-[#1c2733]">
      <div className="bg-[#2d3f52] px-4 py-2 text-center text-xs text-white">
        Fictional demonstration portal. Not a real government website, and not connected to one.
      </div>

      <header className="border-b-4 border-[#8a6a2f] bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <div className="size-10 rounded-sm bg-[#2d3f52]" aria-hidden />
          <div>
            <p className="font-display text-lg leading-tight">Demo State Services Portal</p>
            <p className="text-xs text-[#5a6b7c]">Certificates · Application form IC-2 (fictional)</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-display text-2xl">Application for Income Certificate</h1>
        <p className="mt-1 text-sm text-[#5a6b7c]">
          All fields marked with an asterisk are mandatory. Incomplete applications are rejected.
        </p>

        <div className="mt-6 space-y-6">
          <PortalSection title="A. Applicant details">
            <PortalField label="Applicant name *" />
            <PortalField label="Father's / guardian's name *" />
            <PortalField label="Date of birth *" />
            <PortalField label="Mobile number *" />
          </PortalSection>

          <PortalSection title="B. Address">
            <PortalField label="House / street *" />
            <PortalField label="District *" />
            <PortalField label="PIN code *" />
          </PortalSection>

          <PortalSection title="C. Income details">
            <PortalField label="Annual household income *" />
            <PortalField label="Occupation *" />
            <PortalField label="Number of dependants *" />
          </PortalSection>

          <PortalSection title="D. Enclosures">
            <ul className="col-span-full space-y-2 text-sm">
              {PAGE_REQUIREMENTS.map((requirement) => (
                <li
                  key={requirement.label}
                  className="flex items-center justify-between border border-[#cdd6df] bg-white px-3 py-2"
                >
                  <span>
                    {requirement.label}
                    <span className="ml-2 text-xs text-[#5a6b7c]">{requirement.hint}</span>
                  </span>
                  <span className="border border-[#cdd6df] px-2 py-1 text-xs text-[#5a6b7c]">
                    Choose file
                  </span>
                </li>
              ))}
            </ul>
          </PortalSection>
        </div>

        <p className="mt-8 text-sm text-[#5a6b7c]">
          This page is a mock-up. Nothing on it works, and nothing is submitted.
        </p>
      </main>

      <ReadinessPanel />
    </div>
  );
}

function PortalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-[#cdd6df] bg-white">
      <h2 className="border-b border-[#cdd6df] bg-[#f5f7f9] px-4 py-2 text-sm font-semibold">
        {title}
      </h2>
      <div className="grid gap-4 p-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function PortalField({ label }: { label: string }) {
  return (
    <div>
      <span className="block text-xs text-[#5a6b7c]">{label}</span>
      <div className="mt-1 h-9 border border-[#cdd6df] bg-[#fbfcfd]" aria-hidden />
    </div>
  );
}

function ReadinessPanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FromPageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function check() {
    setOpen(true);
    if (data || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      setData(
        await apiSend<FromPageResponse>('/readiness/from-page', 'POST', {
          serviceId: 'income-certificate',
          detectedRequirements: PAGE_REQUIREMENTS.map(({ label }) => ({ label })),
        }),
      );
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={check}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white shadow-xl"
      >
        <ShieldCheck size={18} aria-hidden />
        Application Readiness
      </button>
    );
  }

  return (
    <aside className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-2xl">
      <div className="flex items-center justify-between gap-2 bg-brand px-4 py-3 text-white">
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          <ShieldCheck size={18} aria-hidden />
          Taiyaar
        </span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close readiness panel">
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
        {loading ? <Spinner label="Reading this page…" /> : null}

        {failed ? (
          <div>
            <p className="text-sm text-ink">We could not check this page just now.</p>
            <Button variant="secondary" className="mt-3" onClick={check}>
              Try again
            </Button>
          </div>
        ) : null}

        {data ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              We read {data.matched.length} requirements from this page and checked them against
              what you have prepared.
            </p>

            <ul className="space-y-2">
              {data.matched.map(({ detected, item }) => (
                <li key={detected} className="flex items-start gap-2.5">
                  {item ? (
                    <StatusIndicator status={item.status} showLabel={false} size="sm" />
                  ) : (
                    <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-paper text-xs text-muted">
                      ?
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{detected}</span>
                    <span className="block text-xs text-muted">
                      {item ? item.reason : 'Not part of this prototype’s checklist.'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="rounded-xl bg-paper p-3 text-xs text-muted">
              A browser extension would call the same endpoint this panel just used. Nothing about
              the backend changes to support it.
            </div>

            <Link to="/prepare/income-certificate/documents">
              <Button block variant="secondary" icon={<ExternalLink size={16} aria-hidden />}>
                Open my checklist
              </Button>
            </Link>
          </div>
        ) : null}

        {!loading && !data && !failed ? (
          <Button block onClick={check} icon={<ChevronDown size={16} aria-hidden />}>
            Check this page
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
