import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Paperclip, Send } from 'lucide-react';
import type { ApplicationStep } from '@taiyaar/shared';
import { usePreparation } from '../lib/hooks';
import { useApp } from '../state/AppContext';
import { ApiError } from '../api/client';
import {
  Button,
  Card,
  ErrorNotice,
  LoadingScreen,
} from '../components/ui/Primitives';
import { Field } from '../components/ui/Field';
import { Stepper } from '../components/Stepper';
import { useToast } from '../components/ui/Overlay';
import { PrototypeNote } from '../components/Layout';

export function Apply() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { session, patchApplication, submitApplication } = useApp();
  const { service, readiness, loading, error, reload } = usePreparation(serviceId);

  const application = session?.application;
  const [stepIndex, setStepIndex] = useState(application?.currentStepIndex ?? 0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | null>(null);

  // If the citizen lands here without a started application, send them back to
  // the readiness screen rather than showing an empty form.
  useEffect(() => {
    if (!loading && !application && serviceId) navigate(`/prepare/${serviceId}/readiness`, { replace: true });
  }, [loading, application, serviceId, navigate]);

  if (loading) return <LoadingScreen label="Opening your application…" />;
  if (error) return <ErrorNotice message={error.message} action={error.action} onRetry={reload} />;
  if (!service || !application || !readiness || !serviceId) return null;

  const steps = service.applicationSteps;
  const step = steps[stepIndex];
  if (!step) return null;

  const valueFor = (fieldId: string): string => values[fieldId] ?? application.values[fieldId] ?? '';

  function validate(current: ApplicationStep): boolean {
    const next: Record<string, string> = {};
    for (const field of current.fields) {
      if (field.required && !valueFor(field.id).trim()) next[field.id] = 'Please fill this in.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function goTo(index: number) {
    if (!application) return;
    setBusy(true);
    setFailure(null);
    try {
      await patchApplication(application.id, { values, currentStepIndex: index });
      setValues({});
      setStepIndex(index);
      window.scrollTo(0, 0);
    } catch (caught) {
      setFailure(
        caught instanceof ApiError
          ? caught
          : new ApiError('We could not save that.', 'Try again.', 'save'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function attach(requirementId: string) {
    if (!application) return;
    setBusy(true);
    try {
      await patchApplication(application.id, { attachRequirementId: requirementId });
      toast('Attached.');
    } catch {
      toast('We could not attach that document. Try again.', 'miss');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!application) return;
    setBusy(true);
    setFailure(null);
    try {
      await submitApplication(application.id);
      navigate('/complete');
    } catch (caught) {
      setFailure(
        caught instanceof ApiError
          ? caught
          : new ApiError('We could not submit this.', 'Check the earlier steps and try again.', 'submit'),
      );
    } finally {
      setBusy(false);
    }
  }

  const attachedIds = new Set(application.attachedDocuments.map((d) => d.requirementId));
  const documentItems = readiness.items.filter((item) => item.type === 'document');
  const allAttached = documentItems.every((item) => attachedIds.has(item.requirementId));
  const isLast = stepIndex === steps.length - 1;

  return (
    <div className="pb-28 sm:pb-0">
      <Stepper steps={steps.map((s) => ({ id: s.id, title: s.title }))} currentIndex={stepIndex} />

      <header className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">{service.name}</p>
        <h1 className="mt-2 text-3xl">{step.title}</h1>
        <p className="mt-2 text-muted">{step.description}</p>
      </header>

      {step.kind === 'fields' ? (
        <Card className="space-y-6 p-5 sm:p-6">
          {step.fields.map((field) => (
            <Field
              key={field.id}
              label={field.label}
              inputType={field.inputType}
              options={field.options}
              required={field.required}
              placeholder={field.placeholder}
              helpText={
                field.prefillFrom && application.values[field.id]
                  ? `${field.helpText ? `${field.helpText} ` : ''}Filled in from what you prepared.`
                  : field.helpText
              }
              value={valueFor(field.id)}
              error={errors[field.id]}
              onChange={(value) => {
                setValues((current) => ({ ...current, [field.id]: value }));
                setErrors((current) => {
                  const { [field.id]: _removed, ...rest } = current;
                  return rest;
                });
              }}
            />
          ))}
        </Card>
      ) : null}

      {step.kind === 'documents' ? (
        <div className="space-y-4">
          <ul className="space-y-3">
            {documentItems.map((item) => {
              const attached = attachedIds.has(item.requirementId);
              return (
                <Card as="li" key={item.requirementId} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-muted">{item.title}</p>
                      <p className="font-medium text-ink">{item.matchedDocumentName}</p>
                      <p className="text-sm text-muted">{item.reason}</p>
                    </div>
                    {attached ? (
                      <span className="inline-flex items-center gap-2 rounded-xl bg-ready-soft px-3 py-2 text-sm font-medium text-ready">
                        <Check size={16} strokeWidth={3} aria-hidden />
                        Attached
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        icon={<Paperclip size={16} aria-hidden />}
                        disabled={busy}
                        onClick={() => attach(item.requirementId)}
                      >
                        Use document
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </ul>
          {!allAttached ? (
            <p className="text-sm text-muted">Attach every document to continue.</p>
          ) : null}
        </div>
      ) : null}

      {step.kind === 'review' ? (
        <div className="space-y-6">
          {steps
            .filter((s) => s.kind === 'fields')
            .map((fieldStep) => (
              <Card key={fieldStep.id} className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                  <h2 className="text-lg">{fieldStep.title}</h2>
                  <Button
                    variant="ghost"
                    onClick={() => goTo(steps.findIndex((s) => s.id === fieldStep.id))}
                  >
                    Change
                  </Button>
                </div>
                <dl className="divide-y divide-line">
                  {fieldStep.fields.map((field) => (
                    <div
                      key={field.id}
                      className="grid gap-1 px-5 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4"
                    >
                      <dt className="text-sm text-muted">{field.label}</dt>
                      <dd className="text-ink">{application.values[field.id] || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ))}

          <Card className="overflow-hidden">
            <div className="border-b border-line px-5 py-3">
              <h2 className="text-lg">Documents attached</h2>
            </div>
            <ul className="divide-y divide-line">
              {application.attachedDocuments.map((attached) => (
                <li key={attached.requirementId} className="flex items-center gap-3 px-5 py-3">
                  <Check size={18} className="shrink-0 text-ready" aria-hidden />
                  <span>
                    <span className="block text-sm text-muted">{attached.requirementTitle}</span>
                    <span className="block text-ink">{attached.documentName}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <PrototypeNote text="Submitting is simulated. Nothing is sent to any government system, and no data leaves this prototype." />
        </div>
      ) : null}

      {failure ? (
        <div className="mt-6">
          <ErrorNotice message={failure.message} action={failure.action} />
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-4 backdrop-blur sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto flex max-w-3xl gap-3">
          {stepIndex > 0 ? (
            <Button
              variant="secondary"
              icon={<ArrowLeft size={18} aria-hidden />}
              disabled={busy}
              onClick={() => goTo(stepIndex - 1)}
            >
              Back
            </Button>
          ) : null}

          {isLast ? (
            <Button block loading={busy} icon={<Send size={18} aria-hidden />} onClick={submit}>
              Submit application
            </Button>
          ) : (
            <Button
              block
              loading={busy}
              icon={<ArrowRight size={18} aria-hidden />}
              disabled={step.kind === 'documents' && !allAttached}
              onClick={() => {
                if (step.kind === 'fields' && !validate(step)) return;
                goTo(stepIndex + 1);
              }}
            >
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
