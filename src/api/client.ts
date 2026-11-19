// Thin fetch wrapper for the Aapka PG REST API.
// Handles the base URL, the bearer token, JSON encoding and error normalization.

// Empty by default so requests are same-origin: Vite proxies /api in dev and
// Express serves the built SPA in production. Set VITE_API_URL only when the
// API lives on a different origin.
export const API_BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  details?: ApiErrorDetail[];

  constructor(status: number, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  /** First field-level message, when the server returned validation details. */
  get firstDetail(): string | undefined {
    return this.details?.[0]?.message;
  }
}

const SESSION_KEY = 'aapka-pg-session';

export interface Session {
  token: string;
  role: 'tenant' | 'manager' | 'owner' | 'admin';
  pgId: string | null;
  user: Record<string, unknown>;
}

export const sessionStore = {
  load(): Session | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },
  save(session: Session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },
  clear() {
    localStorage.removeItem(SESSION_KEY);
  },
};

export const getToken = () => sessionStore.load()?.token ?? null;

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  { auth = true }: { auth?: boolean } = {}
): Promise<T> {
  const token = auth ? getToken() : null;
  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, {
      method,
      headers: {
        // For FormData the browser sets the multipart boundary itself.
        ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running?');
  }

  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const details: ApiErrorDetail[] | undefined = Array.isArray(payload?.details)
      ? payload.details
          .filter((d: { message?: unknown }) => typeof d?.message === 'string')
          .map((d: { path?: unknown; message: string }) => ({
            path: Array.isArray(d.path) ? d.path.join('.') : String(d.path ?? ''),
            message: d.message,
          }))
      : undefined;
    throw new ApiError(res.status, payload?.message ?? `Request failed (${res.status})`, details);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, opts?: { auth?: boolean }) => request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: { auth?: boolean }) => request<T>('POST', path, body ?? {}, opts),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, form),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  del: <T>(path: string) => request<T>('DELETE', path),
};

/** Normalize any thrown value into a user-facing message. */
export const errorMessage = (err: unknown): string => {
  if (err instanceof ApiError) return err.firstDetail ?? err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
};
