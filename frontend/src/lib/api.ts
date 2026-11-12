import type { Content, OnboardingAnswers, PlayerState } from './types';

/** El servidor ha respondido que no (4xx): reintentar la misma petición no lo arregla. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Sin cobertura o servidor caído: se puede reintentar más tarde. */
export class NetworkError extends Error {
  constructor(message = 'Sin conexión') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * El servidor pide esperar (429). Para la cola es como estar sin conexión: se
 * reintenta más tarde. Tiene nombre propio para poder decírselo al jugador.
 */
export class TooManyRequestsError extends NetworkError {
  constructor() {
    super('Demasiadas peticiones (429)');
    this.name = 'TooManyRequestsError';
  }
}

// Vacío en web (mismo origen). En la app nativa (Capacitor) será la URL pública de la API.
const BASE_URL: string = import.meta.env.VITE_API_URL ?? '';

const TOO_MANY_REQUESTS = 429;

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new NetworkError();
  }
  if (response.status === TOO_MANY_REQUESTS) {
    throw new TooManyRequestsError();
  }
  if (response.status >= 500 || response.status === 408) {
    throw new NetworkError(`Servidor no disponible (${response.status})`);
  }
  if (!response.ok) {
    throw new ApiError(response.status, await errorDetail(response));
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

/** El backend responde los errores como application/problem+json. */
async function errorDetail(response: Response): Promise<string> {
  try {
    const problem = (await response.json()) as { detail?: string; title?: string };
    return problem.detail ?? problem.title ?? `Error ${response.status}`;
  } catch {
    return `Error ${response.status}`;
  }
}

function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) }, token);
}

export const api = {
  content: () => request<Content>('/content'),
  register: (answers: OnboardingAnswers) => post<{ token: string; state: PlayerState }>('/players', answers),
  me: (token: string) => request<PlayerState>('/me', {}, token),
  deleteMe: (token: string) => request<void>('/me', { method: 'DELETE' }, token),
  /** Acciones del jugador: todas devuelven su estado actualizado. */
  send: (token: string, path: string, body: unknown) => post<PlayerState>(path, body, token),
};

export type Api = typeof api;
