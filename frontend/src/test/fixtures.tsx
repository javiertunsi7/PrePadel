import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import type { Api } from '../lib/api';
import { AppStore, StoreProvider } from '../lib/store';
import type { Content, OnboardingAnswers, PlayerState, Routine, Step } from '../lib/types';

// Catálogo pequeño con la misma forma que el del backend.

function step(order: number, exerciseSlug: string, name: string, overrides: Partial<Step> = {}): Step {
  return {
    order,
    exerciseSlug,
    name,
    zone: null,
    instructions: `Cómo se hace ${name}.`,
    voiceCue: `Vamos con ${name}.`,
    equipment: null,
    switchSides: false,
    videoUrl: null,
    durationSeconds: 30,
    restSeconds: 0,
    dosage: null,
    ...overrides,
  };
}

/** Dos ejercicios: 30 s + 10 s de descanso, y 20 s cambiando de lado a mitad. */
export const warmup: Routine = {
  slug: 'calentamiento-prepartido',
  name: 'Calentamiento prepartido',
  kind: 'WARMUP',
  zone: null,
  summary: 'Sube pulsaciones antes de jugar.',
  totalSeconds: 60,
  equipment: [],
  steps: [
    step(1, 'marcha-activa', 'Marcha activa', { restSeconds: 10 }),
    step(2, 'estiramiento-gemelo', 'Estiramiento de gemelos', { durationSeconds: 20, switchSides: true }),
  ],
};

function programRoutine(week: number): Routine {
  return {
    slug: `codo-semana-${week}`,
    name: `Codo de pádel · Semana ${week}`,
    kind: 'PROGRAM',
    zone: 'ELBOW',
    summary: `Sesión de la semana ${week}.`,
    totalSeconds: 60,
    equipment: ['Pelota de pádel'],
    steps: [
      step(1, 'apreton-pelota', 'Apretón de pelota', {
        zone: 'ELBOW',
        equipment: 'Pelota de pádel',
        dosage: '3 apretones por mano',
        switchSides: true,
      }),
      // Un ejercicio que todavía no tiene ilustración: la app tiene que funcionar igual.
      step(2, 'ejercicio-sin-dibujo', 'Movilidad de muñeca', { zone: 'ELBOW' }),
    ],
  };
}

export const content: Content = {
  zones: [
    { code: 'ELBOW', name: 'Codo', tagline: 'Antebrazo y agarre fuertes.' },
    { code: 'KNEE', name: 'Rodilla', tagline: 'Piernas estables.' },
  ],
  routines: [warmup, programRoutine(1), programRoutine(2)],
  programs: [
    {
      slug: 'codo-de-padel',
      name: 'Codo de pádel',
      zone: 'ELBOW',
      summary: 'Cuatro semanas para el antebrazo.',
      sessionsPerWeek: 3,
      weeks: [
        { week: 1, title: 'Activar sin dolor', focus: 'Isométricos suaves.', routineSlug: 'codo-semana-1' },
        { week: 2, title: 'Bajadas lentas', focus: 'Excéntricos.', routineSlug: 'codo-semana-2' },
      ],
    },
  ],
  review: { status: 'DRAFT', reviewerName: null, reviewerCredentials: null, reviewedOn: null },
  painRule: { consultScore: 7, persistentScore: 4, persistentDays: 10 },
};

export function playerState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    profile: { age: 47, weeklyHours: 4, level: 'INTERMEDIATE', createdAt: '2026-11-01T10:00:00Z' },
    risk: [
      { zone: 'ELBOW', level: 'HIGH', score: 57, lastPain: 6, reasons: ['Molestia actual de 6/10'] },
      { zone: 'KNEE', level: 'LOW', score: 15, lastPain: 0, reasons: [] },
    ],
    recommendedProgram: 'codo-de-padel',
    enrollment: null,
    recentCompletions: [],
    pain: [],
    alerts: [],
    ...overrides,
  };
}

export const answers: OnboardingAnswers = {
  age: 47,
  weeklyHours: 4,
  level: 'INTERMEDIATE',
  discomfort: { ELBOW: 6, KNEE: 0 },
  healthDataConsent: true,
};

/** API falsa: todo responde bien salvo lo que el test sustituya. */
export function fakeApi(overrides: Partial<Api> = {}): Api {
  return {
    content: vi.fn(async () => content),
    register: vi.fn(async () => ({ token: 'token-de-prueba', state: playerState() })),
    me: vi.fn(async () => playerState()),
    deleteMe: vi.fn(async () => undefined),
    send: vi.fn(async () => playerState()),
    ...overrides,
  };
}

/** Store con el catálogo cargado y un jugador ya registrado. */
export async function registeredStore(api: Api): Promise<AppStore> {
  const store = new AppStore(api);
  await store.sync();
  await store.register(answers);
  return store;
}

/** Jugador registrado cuyo servidor devuelve siempre ese estado. */
export function storeWithState(state: PlayerState): Promise<AppStore> {
  return registeredStore(
    fakeApi({
      register: vi.fn(async () => ({ token: 'token-de-prueba', state })),
      me: vi.fn(async () => state),
      send: vi.fn(async () => state),
    }),
  );
}

export function renderApp(ui: ReactNode, store: AppStore, path = '/') {
  return render(
    <StoreProvider store={store}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </StoreProvider>,
  );
}
