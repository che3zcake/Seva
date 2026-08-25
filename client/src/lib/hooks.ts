import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReadinessResult, ServiceDefinition } from '@taiyaar/shared';
import { ApiError } from '../api/client';
import { useApp } from '../state/AppContext';

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(
        'Something went wrong.',
        'Try again in a moment. Nothing you prepared is lost.',
        'unknown',
      );
}

export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(toApiError(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, error, loading, retry: useCallback(() => setNonce((n) => n + 1), []) };
}

/**
 * Every preparation screen needs the same two things: the service definition
 * and a freshly computed readiness result.
 */
export function usePreparation(serviceId: string | undefined) {
  const { loadService, refreshReadiness, readiness: live } = useApp();

  const { data, error, loading, retry } = useAsync<{
    service: ServiceDefinition;
    readiness: ReadinessResult;
  } | null>(async () => {
    if (!serviceId) return null;
    const service = await loadService(serviceId);
    const readiness = await refreshReadiness(serviceId);
    return { service, readiness };
  }, [serviceId]);

  return {
    service: data?.service ?? null,
    // Prefer the context's copy: every mutation refreshes it, while the fetched
    // one is frozen at mount. Guarded by serviceId so a stale service's result
    // can never leak into another one's screen.
    readiness: live?.serviceId === serviceId ? live : (data?.readiness ?? null),
    error,
    loading,
    reload: retry,
  };
}
