const SESSION_KEY = 'taiyaar.sessionId';

/**
 * The session id is the only thing kept in the browser. Everything else lives
 * on the server, so refreshing mid-demo picks up exactly where you were.
 */
export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    /** What the citizen can do next. Always present. */
    readonly action: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  error?: { message?: string; action?: string; code?: string };
}

async function handle<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;

  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // A non-JSON body means the server is down or something upstream broke.
  }

  throw new ApiError(
    body.error?.message ?? 'We could not reach the service.',
    body.error?.action ?? 'Check your connection and try again. Nothing you prepared is lost.',
    body.error?.code ?? 'network_error',
  );
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'x-session-id': getSessionId() },
  });
  return handle<T>(response);
}

export async function apiSend<T>(
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      'x-session-id': getSessionId(),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handle<T>(response);
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'x-session-id': getSessionId() },
    body: form,
  });
  return handle<T>(response);
}
