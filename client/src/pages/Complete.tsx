import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { useApp } from '../state/AppContext';
import { Button, Card } from '../components/ui/Primitives';

export function Complete() {
  const navigate = useNavigate();
  const { session, resetSession } = useApp();
  const application = session?.application;

  useEffect(() => {
    if (application?.status !== 'submitted') navigate('/', { replace: true });
  }, [application, navigate]);

  if (application?.status !== 'submitted') return null;

  const rows: [string, string][] = [
    ['Application ID', application.referenceId ?? '—'],
    ['Status', 'Submitted to the simulated service'],
    ['Service', application.serviceName],
    ['Documents', `${application.attachedDocuments.length} prepared and attached`],
    ['Issues', '0 remaining'],
  ];

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-ready" aria-hidden>
          <CheckCircle2 size={32} />
        </span>
        <h1 className="text-3xl sm:text-4xl">You&rsquo;re done.</h1>
      </div>
      <p className="mt-3 text-lg text-muted">Your application package is ready.</p>

      <Card className="mt-8 overflow-hidden border-ready/40">
        <dl className="divide-y divide-line">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_1fr] sm:gap-4">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="mt-6 border-info/30 bg-info-soft p-5">
        <h2 className="text-lg text-info">No government system was contacted</h2>
        <p className="mt-2 text-ink">
          This submission is simulated. No government application was submitted, no data left this
          prototype, no account was contacted, and the reference number above is invented.
        </p>
      </Card>

      <section className="mt-8">
        <h2 className="text-xl">What just happened</h2>
        <p className="mt-2 text-muted">
          You found out what the application needed, checked what you already had, dealt with one
          document that did not match, and only then opened the form. The form itself took a few
          taps because the hard part was already done.
        </p>
      </section>

      <div className="mt-8">
        <Button
          block
          variant="secondary"
          icon={<RotateCcw size={18} aria-hidden />}
          onClick={async () => {
            await resetSession();
            navigate('/services');
          }}
        >
          Start another application
        </Button>
      </div>
    </div>
  );
}
