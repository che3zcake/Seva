import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FileCheck2, FolderSearch, PlayCircle, Zap } from 'lucide-react';
import { Button, Card, ErrorNotice, buttonClasses } from '../components/ui/Primitives';
import { useApp } from '../state/AppContext';
import { ApiError } from '../api/client';

const STEPS = [
  {
    icon: FolderSearch,
    title: 'Rehearse the journey',
    body: 'Before you open the form, we run your documents against the checklist the application uses.',
  },
  {
    icon: FileCheck2,
    title: 'See where it stops',
    body: 'One clear answer: the first place this journey halts, at which step, and the shortest way past it.',
  },
  {
    icon: PlayCircle,
    title: 'Then start, once',
    body: 'Fix it here, and the same preparation flows straight into a prefilled application.',
  },
];

const TODAY = [
  'Open the application',
  'Fill in nine screens',
  'Reach the enclosures step',
  'Discover the income document is wrong',
  'Stop',
  'Come back another day',
  'Start again',
];

const INSTEAD = [
  'Check before starting',
  'See the first stop immediately',
  'Fix that one thing',
  'Re-check',
  'Ready',
  'Fill the form once',
];

export function Landing() {
  const navigate = useNavigate();
  const { seedDemo } = useApp();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | null>(null);

  async function startDemo() {
    setBusy(true);
    setFailure(null);
    try {
      const serviceId = await seedDemo();
      navigate(`/prepare/${serviceId}/readiness`);
    } catch (error) {
      setFailure(
        error instanceof ApiError
          ? error
          : new ApiError('We could not start the demo.', 'Try again in a moment.', 'demo'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          Independent public-service redesign concept
        </p>
        <h1 className="mt-2 text-[2.6rem] leading-[0.95] sm:text-6xl">
          Find the failure
          <br />
          before the form does.
        </h1>

        <Card className="mt-4 border-brand/30 bg-brand-soft/40 p-4">
          <p className="text-lg text-ink">
            Rahul needs an income certificate for a scholarship. Let&rsquo;s check whether he can
            finish before opening the form.
          </p>
        </Card>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <Button block loading={busy} icon={<Zap size={18} aria-hidden />} onClick={startDemo}>
            Start 60-second demo
          </Button>
          <Link to="/services" className={buttonClasses('secondary', true)}>
            Explore from the beginning
          </Link>
        </div>

        {failure ? (
          <div className="mt-5">
            <ErrorNotice message={failure.message} action={failure.action} onRetry={startDemo} />
          </div>
        ) : null}

        <p className="mt-4 text-sm text-muted">
          Modelled on the income-certificate journey reachable through UMANG&rsquo;s Telangana
          MeeSeva services. Independent concept — not affiliated with, endorsed by or connected to
          UMANG, MeeSeva or any government body. Every service rule, document, locker and
          submission here is synthetic, and no live system is contacted.
        </p>
      </section>

      <section id="how-it-works" className="scroll-mt-8">
        <h2 className="text-2xl">How it works</h2>
        <ol className="mt-4 space-y-2.5">
          {STEPS.map((step, index) => (
            <Card as="li" key={step.title} className="flex gap-3.5 p-4">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"
                aria-hidden
              >
                <step.icon size={20} />
              </span>
              <div>
                <h3 className="text-lg">
                  <span className="text-muted">{index + 1}. </span>
                  {step.title}
                </h3>
                <p className="mt-1 text-muted">{step.body}</p>
              </div>
            </Card>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-2xl">Why this exists</h2>
        <p className="mt-2 max-w-xl text-muted">
          A checklist tells you what is required. It does not tell you where <em>your</em> documents
          will fail. The expensive moment is finding that out after you have started.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <h3 className="text-base font-semibold uppercase tracking-wide text-muted">
              How it usually goes
            </h3>
            <ol className="mt-3 space-y-1.5 text-sm">
              {TODAY.map((line, index) => (
                <li key={line} className="flex gap-3">
                  <span className="w-4 shrink-0 text-right text-muted" aria-hidden>
                    {index + 1}
                  </span>
                  <span className={index >= 3 && index <= 5 ? 'text-miss' : 'text-ink'}>{line}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="border-brand/30 bg-brand-soft/40 p-4">
            <h3 className="text-base font-semibold uppercase tracking-wide text-brand-dark">
              With Seva
            </h3>
            <ol className="mt-3 space-y-1.5 text-sm">
              {INSTEAD.map((line, index) => (
                <li key={line} className="flex gap-3">
                  <span className="w-4 shrink-0 text-right text-muted" aria-hidden>
                    {index + 1}
                  </span>
                  <span className={index === 4 ? 'font-medium text-ready' : 'text-ink'}>{line}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </section>

      <section>
        <Card className="p-5">
          <h2 className="text-xl">What is real, and what is not</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-medium text-ink">Real</dt>
              <dd className="text-muted">
                The checklist engine, the document matching, the stop ordering and the gate that
                keeps you out of the form. All deterministic, all tested.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Simulated</dt>
              <dd className="text-muted">
                The service rules, the DigiLocker account and its documents, the reading of an
                uploaded file, the application, and the submission. Nothing is sent anywhere.
              </dd>
            </div>
          </dl>
        </Card>
      </section>
    </div>
  );
}
