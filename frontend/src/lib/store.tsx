import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { ApiError, type Api } from './api';
import { load, remove, save } from './storage';
import { applyOptimistic, newId, toRequest, type Mutation } from './sync';
import type { Content, OnboardingAnswers, PainContext, PlayerState, PushTarget } from './types';

export interface Settings {
  /** Voz y pitidos del modo manos libres. */
  voice: boolean;
}

export interface MatchOptions {
  /** Se repite cada semana el mismo día y a la misma hora. */
  weekly: boolean;
  /** El servidor también avisa, aunque la app esté cerrada. */
  remote: boolean;
}

const NO_MATCH_OPTIONS: MatchOptions = { weekly: false, remote: false };

export interface AppState {
  /** Token del jugador; null hasta que rellena el cuestionario. */
  token: string | null;
  /** Catálogo de zonas, rutinas y programas. */
  content: Content | null;
  /** Estado del jugador: copia local, con lo pendiente de enviar ya aplicado. */
  me: PlayerState | null;
  /** Acciones hechas en el móvil que el servidor aún no ha confirmado. */
  outbox: Mutation[];
  settings: Settings;
  /** Hora del próximo partido (ISO), para el recordatorio. */
  matchAt: string | null;
  matchOptions: MatchOptions;
  /** El último intento de hablar con el servidor falló por falta de red. No se guarda. */
  offline: boolean;
}

/** Lo que sobrevive a cerrar la app. */
const STORAGE_KEYS: { [K in keyof AppState]?: string } = {
  token: 'prepadel.token',
  content: 'prepadel.content',
  me: 'prepadel.me',
  outbox: 'prepadel.outbox',
  settings: 'prepadel.settings',
  matchAt: 'prepadel.match',
  matchOptions: 'prepadel.match-options',
};

/**
 * Estado de la app, offline first: todo se lee de la copia guardada en el
 * móvil y se sincroniza con el servidor cuando hay cobertura.
 */
export class AppStore {
  private readonly api: Api;
  private state: AppState;
  private readonly listeners = new Set<() => void>();
  /** Las llamadas al servidor van de una en una, en orden. */
  private chain: Promise<void> = Promise.resolve();

  constructor(api: Api) {
    this.api = api;
    this.state = {
      token: load<string>('prepadel.token'),
      content: load<Content>('prepadel.content'),
      me: load<PlayerState>('prepadel.me'),
      outbox: load<Mutation[]>('prepadel.outbox') ?? [],
      settings: load<Settings>('prepadel.settings') ?? { voice: true },
      matchAt: load<string>('prepadel.match'),
      matchOptions: load<MatchOptions>('prepadel.match-options') ?? NO_MATCH_OPTIONS,
      offline: false,
    };
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): AppState => this.state;

  /** Al abrir la app y al recuperar cobertura: catálogo al día, cola enviada y estado refrescado. */
  sync(): Promise<void> {
    return this.schedule(async () => {
      try {
        this.set({ content: await this.api.content(), offline: false });
      } catch {
        this.set({ offline: true }); // sin red: vale el catálogo guardado
      }
      await this.drain(true);
    });
  }

  /** Cuestionario inicial. Necesita conexión; si falla, lanza el error para mostrarlo. */
  async register(answers: OnboardingAnswers): Promise<void> {
    const { token, state } = await this.api.register(answers);
    this.set({ token, me: state, outbox: [], offline: false });
  }

  completeRoutine(routineSlug: string): void {
    this.enqueue({ kind: 'completion', id: newId(), routineSlug, completedAt: new Date().toISOString() });
  }

  abandonRoutine(routineSlug: string, exerciseSlug: string): void {
    this.enqueue({
      kind: 'abandonment',
      id: newId(),
      routineSlug,
      exerciseSlug,
      abandonedAt: new Date().toISOString(),
    });
  }

  logPain(zone: string, score: number, context: PainContext = 'POST_MATCH'): void {
    this.enqueue({ kind: 'pain', id: newId(), zone, score, context, recordedAt: new Date().toISOString() });
  }

  enroll(programSlug: string): void {
    this.enqueue({ kind: 'enroll', id: newId(), programSlug });
  }

  setVoice(voice: boolean): void {
    this.set({ settings: { ...this.state.settings, voice } });
  }

  /** Marca el partido (o lo quita con null). Quitarlo cancela también el aviso del servidor. */
  setMatch(matchAt: string | null, weekly = false): void {
    const wasRemote = this.state.matchOptions.remote;
    this.set({ matchAt, matchOptions: { weekly: matchAt !== null && weekly, remote: false } });
    if (matchAt === null && (wasRemote || this.state.content?.pushPublicKey)) {
      this.enqueue({ kind: 'reminder', id: newId(), matchAt: null, subscription: null, weekly: false, timeZone: null });
    }
  }

  /** Partido semanal ya jugado: pasa al de la semana que viene. El servidor hace lo mismo por su cuenta. */
  nextWeekMatch(matchAt: string): void {
    this.set({ matchAt });
  }

  /** Pide al servidor el aviso con la app cerrada. Se ignora si el jugador ya cambió o quitó el partido. */
  remindWhenClosed(matchAt: string, subscription: PushTarget): void {
    if (this.state.matchAt !== matchAt) {
      return;
    }
    const { weekly } = this.state.matchOptions;
    this.set({ matchOptions: { weekly, remote: true } });
    this.enqueue({
      kind: 'reminder',
      id: newId(),
      matchAt,
      subscription,
      weekly,
      // Para que el partido semanal siga a la misma hora cuando cambia el horario de verano.
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    });
  }

  /** Copia de los datos del servidor. Envía antes lo pendiente para que salga todo. Necesita conexión. */
  async exportData(): Promise<unknown> {
    const token = this.state.token;
    if (!token) {
      throw new Error('Sin jugador');
    }
    await this.schedule(() => this.drain(false));
    return this.api.exportMe(token);
  }

  /** Borra la cuenta en el servidor (necesita conexión) y después todo lo guardado en el móvil. */
  async deleteAccount(): Promise<void> {
    const token = this.state.token;
    if (token) {
      await this.api.deleteMe(token);
    }
    this.forget();
  }

  private enqueue(mutation: Mutation): void {
    const { me, content, outbox } = this.state;
    if (!me) {
      return;
    }
    this.set({ me: applyOptimistic(me, mutation, content), outbox: [...outbox, mutation] });
    void this.schedule(() => this.drain(false));
  }

  /**
   * Envía la cola en orden. Si se cae la red, lo que falte espera al siguiente
   * intento; si el servidor rechaza una acción (4xx), se descarta para que no
   * bloquee a las demás.
   */
  private async drain(refreshWhenIdle: boolean): Promise<void> {
    const token = this.state.token;
    if (!token) {
      return;
    }
    let server: PlayerState | null = null;
    let offline = false;
    try {
      while (this.state.outbox.length > 0) {
        const next = this.state.outbox[0];
        const { path, body } = toRequest(next);
        try {
          server = await this.api.send(token, path, body);
        } catch (error) {
          if (!(error instanceof ApiError)) {
            offline = true;
            break;
          }
          if (error.status === 401) {
            throw error;
          }
        }
        this.set({ outbox: this.state.outbox.filter((mutation) => mutation.id !== next.id) });
      }
      if (!offline && !server && refreshWhenIdle) {
        server = await this.api.me(token);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        this.forget(); // el servidor ya no conoce a este jugador: toca empezar de nuevo
        return;
      }
      offline = true;
    }
    if (this.state.token !== token) {
      return;
    }
    if (server) {
      // Lo que siga pendiente se vuelve a aplicar encima de la respuesta del servidor.
      const { outbox, content } = this.state;
      this.set({
        offline,
        me: outbox.reduce((state, mutation) => applyOptimistic(state, mutation, content), server),
      });
    } else if (offline !== this.state.offline) {
      this.set({ offline });
    }
  }

  private forget(): void {
    this.set({ token: null, me: null, outbox: [], matchAt: null, matchOptions: NO_MATCH_OPTIONS, offline: false });
  }

  private schedule(task: () => Promise<void>): Promise<void> {
    this.chain = this.chain.then(task, task);
    return this.chain;
  }

  private set(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    for (const key of Object.keys(patch) as (keyof AppState)[]) {
      const storageKey = STORAGE_KEYS[key];
      if (!storageKey) {
        continue;
      }
      const value = this.state[key];
      if (value === null) {
        remove(storageKey);
      } else {
        save(storageKey, value);
      }
    }
    this.listeners.forEach((listener) => listener());
  }
}

const StoreContext = createContext<AppStore | null>(null);

export function StoreProvider({ store, children }: { store: AppStore; children: ReactNode }) {
  useEffect(() => {
    void store.sync();
    const onOnline = () => void store.sync();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void store.sync();
      }
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [store]);

  return <StoreContext value={store}>{children}</StoreContext>;
}

export function useStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('Falta <StoreProvider> por encima de este componente');
  }
  return store;
}

export function useAppState(): AppState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getState);
}
