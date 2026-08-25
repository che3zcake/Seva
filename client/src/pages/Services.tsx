import { Link } from 'react-router-dom';
import { ArrowRight, Clock, FileText, Lock } from 'lucide-react';
import type { ServiceSummary } from '@seva/shared';
import { apiGet } from '../api/client';
import { useAsync } from '../lib/hooks';
import { Badge, Card, ErrorNotice, LoadingScreen, PageHeader } from '../components/ui/Primitives';
import { PrototypeNote } from '../components/Layout';

export function Services() {
  const { data, error, loading, retry } = useAsync(
    () => apiGet<ServiceSummary[]>('/services'),
    [],
  );

  if (loading) return <LoadingScreen label="Loading services…" />;
  if (error) return <ErrorNotice message={error.message} action={error.action} onRetry={retry} />;

  const services = data ?? [];
  const available = services.filter((s) => s.status === 'available');
  const comingSoon = services.filter((s) => s.status === 'coming-soon');

  return (
    <div>
      <PageHeader
        title="What are you applying for?"
        description="Pick a service and we will show you what it needs before you start."
      />

      <ul className="space-y-4">
        {available.map((service) => (
          <Card as="li" key={service.id} className="transition-colors hover:border-brand">
            <Link
              to={`/prepare/${service.id}`}
              className="flex items-start gap-4 p-5 focus-visible:rounded-2xl"
            >
              <span
                className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"
                aria-hidden
              >
                <FileText size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-xl">{service.name}</span>
                  <Badge tone="brand">{service.category}</Badge>
                </span>
                <span className="mt-1 block text-muted">{service.shortDescription}</span>
                <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                  <span>{service.documentCount} documents</span>
                  <span>{service.informationCount} questions</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={14} aria-hidden />
                    about {service.estimatedMinutes} min
                  </span>
                </span>
              </span>
              <ArrowRight size={20} className="mt-3 shrink-0 text-brand" aria-hidden />
            </Link>
          </Card>
        ))}
      </ul>

      {comingSoon.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
            Not in this prototype yet
          </h2>
          <ul className="mt-4 space-y-3">
            {comingSoon.map((service) => (
              <Card as="li" key={service.id} className="flex items-center gap-4 bg-paper p-4">
                <span className="text-muted" aria-hidden>
                  <Lock size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-muted">{service.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {service.shortDescription}
                  </span>
                </span>
                <Badge>Coming soon</Badge>
              </Card>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Adding one of these is a matter of writing its requirement list — the checking, matching
            and application flow are already shared.
          </p>
        </section>
      ) : null}

      <div className="mt-10">
        <PrototypeNote />
      </div>
    </div>
  );
}
