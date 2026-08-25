import { Link } from 'react-router-dom';
import { ArrowRight, FileCheck2, FolderSearch, PlayCircle } from 'lucide-react';
import { Card, buttonClasses } from '../components/ui/Primitives';

const STEPS = [
  {
    icon: FolderSearch,
    title: 'Choose your service',
    body: 'Pick what you are applying for. We show you what it actually asks for, in plain words.',
  },
  {
    icon: FileCheck2,
    title: 'Prepare your documents',
    body: 'See what you already have, find what is missing, and sort out problems before they cost you time.',
  },
  {
    icon: PlayCircle,
    title: 'Start when you are ready',
    body: 'Open the form knowing every document is in hand and every answer is decided.',
  },
];

const TODAY = [
  'Find the service',
  'Start a long form',
  'Reach question 14',
  'Discover you need an income document',
  'Stop',
  'Go get it',
  'Come back',
  'Start over',
];

const INSTEAD = [
  'Choose the service',
  'See everything it needs',
  'Check what you already have',
  'Pull in what you can',
  'Fix what is wrong',
  'You are ready',
  'Start the form once',
];

export function Landing() {
  return (
    <div className="space-y-16">
      <section>
        <h1 className="text-4xl leading-[1.1] sm:text-5xl">
          Know what you need
          <br />
          before you start.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Check your documents, find what&rsquo;s missing, and prepare your application before
          spending time on a long government form.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/services" className={buttonClasses('primary', true)}>
            <ArrowRight size={18} aria-hidden />
            Check an application
          </Link>
          <a href="#how-it-works" className={buttonClasses('secondary', true)}>
            See how it works
          </a>
        </div>

        <p className="mt-6 text-sm text-muted">Prototype using synthetic government-service data.</p>
      </section>

      <section id="how-it-works" className="scroll-mt-8">
        <h2 className="text-2xl">How it works</h2>
        <ol className="mt-6 space-y-4">
          {STEPS.map((step, index) => (
            <Card as="li" key={step.title} className="flex gap-4 p-5">
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
        <p className="mt-3 max-w-xl text-muted">
          Most of the time lost to a government application is not spent filling it in. It is spent
          starting it, finding out something is missing, and coming back to start again.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <h3 className="text-base font-semibold uppercase tracking-wide text-muted">
              How it usually goes
            </h3>
            <ol className="mt-4 space-y-2 text-sm">
              {TODAY.map((line, index) => (
                <li key={line} className="flex gap-3">
                  <span className="w-4 shrink-0 text-right text-muted" aria-hidden>
                    {index + 1}
                  </span>
                  <span className={index >= 3 && index <= 6 ? 'text-miss' : 'text-ink'}>{line}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="border-brand/30 bg-brand-soft/40 p-5">
            <h3 className="text-base font-semibold uppercase tracking-wide text-brand-dark">
              With Seva
            </h3>
            <ol className="mt-4 space-y-2 text-sm">
              {INSTEAD.map((line, index) => (
                <li key={line} className="flex gap-3">
                  <span className="w-4 shrink-0 text-right text-muted" aria-hidden>
                    {index + 1}
                  </span>
                  <span className={index === 5 ? 'font-medium text-ready' : 'text-ink'}>{line}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </section>

      <section>
        <Card className="p-6">
          <h2 className="text-xl">What this prototype is</h2>
          <p className="mt-3 text-muted">
            Seva is a preparation layer that sits before an application, not another portal and
            not a chatbot. This build demonstrates one service end to end using invented data: the
            requirements, the locker, the documents and the submission are all simulated.
          </p>
          <p className="mt-3 text-muted">
            Nothing here is submitted anywhere, and no real account is ever contacted.
          </p>
        </Card>
      </section>
    </div>
  );
}
