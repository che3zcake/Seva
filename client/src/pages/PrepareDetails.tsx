import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Wand2 } from 'lucide-react';
import type { CitizenProfile, InformationRequirement } from '@taiyaar/shared';
import { usePreparation } from '../lib/hooks';
import { useApp } from '../state/AppContext';
import { ApiError } from '../api/client';
import {
  Button,
  Card,
  ErrorNotice,
  LoadingScreen,
  PageHeader,
} from '../components/ui/Primitives';
import { Field } from '../components/ui/Field';
import { Stepper } from '../components/Stepper';
import { useToast } from '../components/ui/Overlay';

const PREPARE_STEPS = [
  { id: 'details', title: 'About you' },
  { id: 'documents', title: 'Documents' },
  { id: 'readiness', title: 'Ready?' },
];

/** Sample answers so a demo can move quickly. Clearly labelled as invented. */
const SAMPLE: CitizenProfile = {
  fullName: 'Rahul Sharma',
  dateOfBirth: '1998-07-12',
  address: '14, Nehru Nagar, Sector 4, Indore, Madhya Pradesh 452001',
  occupation: 'Salaried employee',
  annualIncome: '186000',
  purpose: 'Education scholarship application',
};

export function PrepareDetails() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { session, saveProfile, refreshReadiness } = useApp();
  const { service, loading, error, reload } = usePreparation(serviceId);

  const [values, setValues] = useState<Partial<CitizenProfile>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);

  if (loading) return <LoadingScreen label="Loading the questions…" />;
  if (error) return <ErrorNotice message={error.message} action={error.action} onRetry={reload} />;
  if (!service) return null;

  const questions = service.requirements.filter(
    (r): r is InformationRequirement => r.type === 'information',
  );

  const valueFor = (field: keyof CitizenProfile): string =>
    values[field] ?? session?.profile[field] ?? '';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!serviceId) return;

    const nextErrors: Record<string, string> = {};
    for (const question of questions) {
      if (question.required && !valueFor(question.field).trim()) {
        nextErrors[question.id] = 'Please fill this in.';
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      // On a phone the error text is usually off-screen above the button, so
      // without this "Continue" just appears to do nothing.
      const firstInvalid = questions.find((question) => nextErrors[question.id]);
      if (firstInvalid) document.getElementById(firstInvalid.id)?.focus();
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await saveProfile(values);
      await refreshReadiness(serviceId);
      navigate(`/prepare/${serviceId}/documents`);
    } catch (caught) {
      setSaveError(
        caught instanceof ApiError
          ? caught
          : new ApiError('We could not save your answers.', 'Try again.', 'save'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Stepper steps={PREPARE_STEPS} currentIndex={0} />
      <PageHeader
        eyebrow={service.name}
        title="A few questions first"
        description="These are the answers the application will ask for. Getting them down now also lets us check them against your documents."
      />

      <div className="mb-6">
        <Button
          type="button"
          variant="secondary"
          icon={<Wand2 size={16} aria-hidden />}
          onClick={() => {
            setValues(SAMPLE);
            setErrors({});
            toast('Filled in with sample details for the demo.', 'info');
          }}
        >
          Fill in sample details
        </Button>
        <p className="mt-2 text-sm text-muted">
          Invented details for a fictional citizen, so you can move through the demo quickly.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Card className="space-y-6 p-5 sm:p-6">
          {questions.map((question) => (
            <Field
              key={question.id}
              id={question.id}
              label={question.title}
              helpText={question.description}
              inputType={question.inputType}
              options={question.options}
              placeholder={question.placeholder}
              required={question.required}
              value={valueFor(question.field)}
              error={errors[question.id]}
              onChange={(value) => {
                setValues((current) => ({ ...current, [question.field]: value }));
                setErrors((current) => {
                  const { [question.id]: _removed, ...rest } = current;
                  return rest;
                });
              }}
            />
          ))}
        </Card>

        {saveError ? (
          <div className="mt-5">
            <ErrorNotice message={saveError.message} action={saveError.action} />
          </div>
        ) : null}

        <div className="mt-6">
          <Button type="submit" block loading={saving} icon={<ArrowRight size={18} aria-hidden />}>
            {saving ? 'Saving…' : 'Check my documents'}
          </Button>
        </div>
      </form>
    </div>
  );
}
