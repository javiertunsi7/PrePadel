import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { ApiError, type Api } from './api';
import { forgetClub, pendingClub } from './club';
import { MATCH_OVER_MS, MAX_MATCHES, matchMoment, nextWeeklyMatch } from './reminder';
import { load, remove, save } from './storage';
import { applyOptimistic, newId, toRequest, type Mutation } from './sync';
import type { Content, OnboardingAnswers, PainContext, PlayerState, PushTarget } from './types';

export interface Settings {
  /** Voz y pitidos del modo manos libres. */
  voice: boolean;
}

/** Un partido con su aviso 30 minutos antes. */
export interface Match {
  /** Lo genera el móvil; el aviso del servidor lleva el mismo id. */
  id: string;
  /** Hora del partido (ISO). En el semanal, la de la próxima vez. */
  at: string;
  /** Se repite cada semana el mismo día y a la misma hora. */
  weekly: boolean;
  /** El servidor también avisa, aunque la app esté cerrada. */
  remote: boolean;
}

/** El partido de cuando solo cabía uno. El servidor lo guarda con este mismo id (migración V8). */
export const LEGACY_MATCH_ID = '00000000-0000-0000-0000-000000000000';

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
  /** Partidos con recordatorio, el más próximo primero. */
  matches: Match[];
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
  matches: 'prepadel.matches',
};

/**
 * Partidos guardados en el móvil. Si viene de cuando solo cabía uno, ese partido pasa a la
 * lista con el id que le dio el servidor al migrar, para poder quitarlo después.
 */
function loadMatches(): Match[] {
  const saved = load<Match[]>('prepadel.matches');
  if (saved) {
    return saved;
  }
  const at = load<string>('prepadel.match');
  const options = load<{ weekly?: boolean; remote?: boolean }>('prepadel.match-options');
  const matches = at
    ? [{ id: LEGACY_MATCH_ID, at, weekly: options?.weekly ?? false, remote: options?.remote ?? false }]
    : [];
  save('prepadel.matches', matches);
  remove('prepadel.match');
  remove('prepadel.match-options');
  return matches;
}

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
      matches: loadMatches(),
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

  /**
   * Cuestionario inicial. Necesita conexión; si falla, lanza el error para mostrarlo.
   * Si la app se abrió con el enlace de un club, el club viaja con las respuestas.
   */
  async register(answers: OnboardingAnswers): Promise<void> {
    const club = pendingClub();
    const { token, state } = await this.api.register(club === null ? answers : { ...answers, club });
    forgetClub();
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

  /** Añade un partido y devuelve su id; null si ya hay uno a esa hora o no caben más. */
  addMatch(at: string, weekly = false): string | null {
    const { matches } = this.state;
    if (matches.length >= MAX_MATCHES || matches.some((match) => Date.parse(match.at) === Date.parse(at))) {
      return null;
    }
    const id = newId();
    this.setMatches([...matches, { id, at, weekly, remote: false }]);
    return id;
  }

  /** Quita un partido y, si el servidor lo tenía, también su aviso con la app cerrada. */
  removeMatch(id: string): void {
    const match = this.state.matches.find((candidate) => candidate.id === id);
    if (!match) {
      return;
    }
    this.setMatches(this.state.matches.filter((candidate) => candidate.id !== id));
    if (match.remote) {
      this.enqueue({ kind: 'match-removal', id: newId(), matchId: id });
    }
  }

  /** Partido jugado ("Listo"): el semanal pasa al de la semana que viene y el suelto se quita. */
  finishMatch(id: string): void {
    const match = this.state.matches.find((candidate) => candidate.id === id);
    if (!match?.weekly) {
      this.removeMatch(id);
      return;
    }
    const at = new Date(match.at);
    this.moveMatch(id, nextWeeklyMatch(at, new Date(at.getTime() + MATCH_OVER_MS)));
  }

  /**
   * Partidos que ya quedan atrás: el semanal pasa al próximo que no haya llegado (el
   * servidor hace lo mismo por su cuenta) y el suelto se quita.
   */
  settleMatches(now: Date): void {
    for (const match of this.state.matches) {
      const at = new Date(match.at);
      if (matchMoment(at, now) !== 'over') {
        continue;
      }
      if (match.weekly) {
        this.moveMatch(match.id, nextWeeklyMatch(at, now));
      } else {
        this.removeMatch(match.id);
      }
    }
  }

  /** Pide al servidor el aviso de ese partido con la app cerrada. Se ignora si el jugador ya lo quitó. */
  remindWhenClosed(id: string, subscription: PushTarget): void {
    const match = this.state.matches.find((candidate) => candidate.id === id);
    if (!match) {
      return;
    }
    this.setMatches(
      this.state.matches.map((candidate) => (candidate.id === id ? { ...candidate, remote: true } : candidate)),
    );
    this.enqueue({
      kind: 'match',
      id: newId(),
      matchId: id,
      matchAt: match.at,
      weekly: match.weekly,
      // Para que el partido semanal siga a la misma hora cuando cambia el horario de verano.
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
      subscription,
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
        const request = toRequest(next);
        try {
          server = await (request.method === 'DELETE'
            ? this.api.remove(token, request.path)
            : this.api.send(token, request.path, request.body));
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
    this.set({ token: null, me: null, outbox: [], matches: [], offline: false });
  }

  private moveMatch(id: string, at: Date): void {
    this.setMatches(this.state.matches.map((match) => (match.id === id ? { ...match, at: at.toISOString() } : match)));
  }

  /** Guarda la lista con el partido más próximo primero. */
  private setMatches(matches: Match[]): void {
    this.set({ matches: [...matches].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)) });
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
