import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  Application,
  CitizenProfile,
  RejectionAutopsy,
  DigiLockerAccount,
  DigiLockerDocument,
  Document,
  DocumentAnalysis,
  ReadinessResult,
  ServiceDefinition,
  SessionState,
} from '@seva/shared';
import { ApiError, apiGet, apiSend, apiUpload, clearSession } from '../api/client';

interface ReadinessResponse {
  readiness: ReadinessResult;
  autopsy: RejectionAutopsy;
  session: SessionState;
}

interface SeedResponse extends ReadinessResponse {
  serviceId: string;
}

interface SubmitResponse {
  application: Application;
  documentsPrepared: number;
  issuesRemaining: number;
  notice: string;
}

interface AppValue {
  session: SessionState | null;
  service: ServiceDefinition | null;
  readiness: ReadinessResult | null;
  autopsy: RejectionAutopsy | null;
  booting: boolean;
  bootError: ApiError | null;

  loadService: (serviceId: string) => Promise<ServiceDefinition>;
  refreshReadiness: (serviceId: string) => Promise<ReadinessResult>;
  saveProfile: (patch: Partial<CitizenProfile>) => Promise<void>;
  connectDigiLocker: () => Promise<{
    account: DigiLockerAccount;
    documents: DigiLockerDocument[];
  }>;
  selectDigiLockerDocuments: (documentIds: string[]) => Promise<void>;
  removeDocument: (documentId: string) => Promise<void>;
  uploadDocument: (
    serviceId: string,
    requirementId: string,
    file: File,
  ) => Promise<{ document: Document; analysis: DocumentAnalysis }>;
  /** Adds the built-in synthetic document, so the demo needs no file picker. */
  addSampleDocument: (
    serviceId: string,
    requirementId: string,
  ) => Promise<{ document: Document; analysis: DocumentAnalysis }>;
  seedDemo: () => Promise<string>;
  resetDemo: () => Promise<void>;
  resolveIssue: (issueId: string) => Promise<void>;
  startApplication: (serviceId: string) => Promise<Application>;
  patchApplication: (
    applicationId: string,
    patch: {
      values?: Record<string, string>;
      currentStepIndex?: number;
      attachRequirementId?: string;
    },
  ) => Promise<Application>;
  submitApplication: (applicationId: string) => Promise<SubmitResponse>;
  resetSession: () => Promise<void>;
  retryBoot: () => void;
}

const AppContext = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [service, setService] = useState<ServiceDefinition | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [autopsy, setAutopsy] = useState<RejectionAutopsy | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<ApiError | null>(null);
  const [bootNonce, setBootNonce] = useState(0);

  // Service definitions never change during a run, so they are fetched once.
  const serviceCache = useRef(new Map<string, ServiceDefinition>());

  useEffect(() => {
    let cancelled = false;
    setBooting(true);
    setBootError(null);

    apiGet<SessionState>('/session')
      .then((loaded) => {
        if (!cancelled) setSession(loaded);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setBootError(
            error instanceof ApiError
              ? error
              : new ApiError('We could not start a session.', 'Reload the page.', 'boot'),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bootNonce]);

  const loadService = useCallback(async (serviceId: string) => {
    const cached = serviceCache.current.get(serviceId);
    if (cached) {
      setService(cached);
      return cached;
    }
    const loaded = await apiGet<ServiceDefinition>(`/services/${serviceId}`);
    serviceCache.current.set(serviceId, loaded);
    setService(loaded);
    return loaded;
  }, []);

  /**
   * Called after every change. Readiness is recomputed server-side rather than
   * patched locally, so what the screen shows can never drift from the truth.
   */
  const refreshReadiness = useCallback(async (serviceId: string) => {
    const response = await apiGet<ReadinessResponse>(`/readiness/${serviceId}`);
    setReadiness(response.readiness);
    setAutopsy(response.autopsy);
    setSession(response.session);
    return response.readiness;
  }, []);

  const saveProfile = useCallback(async (patch: Partial<CitizenProfile>) => {
    setSession(await apiSend<SessionState>('/readiness/profile', 'PATCH', patch));
  }, []);

  const connectDigiLocker = useCallback(async () => {
    const response = await apiSend<{
      account: DigiLockerAccount;
      documents: DigiLockerDocument[];
      session: SessionState;
    }>('/digilocker/connect', 'POST');
    setSession(response.session);
    return { account: response.account, documents: response.documents };
  }, []);

  const selectDigiLockerDocuments = useCallback(async (documentIds: string[]) => {
    setSession(await apiSend<SessionState>('/digilocker/select', 'POST', { documentIds }));
  }, []);

  const removeDocument = useCallback(async (documentId: string) => {
    setSession(await apiSend<SessionState>(`/documents/${documentId}`, 'DELETE'));
  }, []);

  const uploadDocument = useCallback(
    async (serviceId: string, requirementId: string, file: File) => {
      const form = new FormData();
      form.append('serviceId', serviceId);
      form.append('requirementId', requirementId);
      form.append('file', file);
      const response = await apiUpload<{
        document: Document;
        analysis: DocumentAnalysis;
        session: SessionState;
      }>('/documents/upload', form);
      setSession(response.session);
      return { document: response.document, analysis: response.analysis };
    },
    [],
  );

  const addSampleDocument = useCallback(async (serviceId: string, requirementId: string) => {
    const response = await apiSend<{
      document: Document;
      analysis: DocumentAnalysis;
      session: SessionState;
    }>('/documents/sample', 'POST', { serviceId, requirementId });
    setSession(response.session);
    return { document: response.document, analysis: response.analysis };
  }, []);

  /** One tap to the state the demo starts from. */
  const seedDemo = useCallback(async () => {
    const response = await apiSend<SeedResponse>('/demo/seed', 'POST');
    setSession(response.session);
    setReadiness(response.readiness);
    setAutopsy(response.autopsy);
    return response.serviceId;
  }, []);

  const resetDemo = useCallback(async () => {
    const fresh = await apiSend<SessionState>('/demo/reset', 'POST');
    setSession(fresh);
    setReadiness(null);
    setAutopsy(null);
  }, []);

  const resolveIssue = useCallback(async (issueId: string) => {
    setSession(await apiSend<SessionState>('/readiness/resolve-issue', 'POST', { issueId }));
  }, []);

  const startApplication = useCallback(async (serviceId: string) => {
    const updated = await apiSend<SessionState>('/application/start', 'POST', { serviceId });
    setSession(updated);
    if (!updated.application) throw new ApiError('The application did not start.', 'Try again.', 'no_application');
    return updated.application;
  }, []);

  const patchApplication = useCallback<AppValue['patchApplication']>(
    async (applicationId, patch) => {
      const application = await apiSend<Application>(`/application/${applicationId}`, 'PATCH', patch);
      setSession((current) => (current ? { ...current, application } : current));
      return application;
    },
    [],
  );

  const submitApplication = useCallback(async (applicationId: string) => {
    const response = await apiSend<SubmitResponse>(`/application/${applicationId}/submit`, 'POST');
    setSession((current) => (current ? { ...current, application: response.application } : current));
    return response;
  }, []);

  const resetSession = useCallback(async () => {
    clearSession();
    setService(null);
    setReadiness(null);
    setAutopsy(null);
    setSession(await apiGet<SessionState>('/session'));
  }, []);

  const value = useMemo<AppValue>(
    () => ({
      session,
      service,
      readiness,
      autopsy,
      booting,
      bootError,
      loadService,
      refreshReadiness,
      saveProfile,
      connectDigiLocker,
      selectDigiLockerDocuments,
      removeDocument,
      uploadDocument,
      addSampleDocument,
      seedDemo,
      resetDemo,
      resolveIssue,
      startApplication,
      patchApplication,
      submitApplication,
      resetSession,
      retryBoot: () => setBootNonce((n) => n + 1),
    }),
    [
      session,
      service,
      readiness,
      autopsy,
      booting,
      bootError,
      loadService,
      refreshReadiness,
      saveProfile,
      connectDigiLocker,
      selectDigiLockerDocuments,
      removeDocument,
      uploadDocument,
      addSampleDocument,
      seedDemo,
      resetDemo,
      resolveIssue,
      startApplication,
      patchApplication,
      submitApplication,
      resetSession,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
