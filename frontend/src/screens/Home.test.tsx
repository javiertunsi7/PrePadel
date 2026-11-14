import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NetworkError } from '../lib/api';
import type { Enrollment, PainEntry } from '../lib/types';
import { fakeApi, playerState, registeredStore, renderApp, storeWithState } from '../test/fixtures';
import { Home } from './Home';

const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

/** Codo de pádel del catálogo de prueba (2 semanas de 3 sesiones), empezado hace 20 días y terminado. */
function finishedProgram(overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    programSlug: 'codo-de-padel',
    currentWeek: 2,
    totalWeeks: 2,
    sessionsDoneThisWeek: 3,
    sessionsPerWeek: 3,
    routineSlug: 'codo-semana-2',
    completed: true,
    startedAt: daysAgo(20),
    ...overrides,
  };
}

function elbowPain(id: string, score: number, recordedAt: string): PainEntry {
  return { id, zone: 'ELBOW', score, context: 'POST_MATCH', recordedAt };
}

describe('pantalla de inicio', () => {
  it('ofrece el calentamiento, el programa recomendado y el registro de dolor', async () => {
    renderApp(<Home />, await registeredStore(fakeApi()));

    expect(screen.getByRole('link', { name: /Calentamiento prepartido/ })).toHaveAttribute(
      'href',
      '/rutina/calentamiento-prepartido',
    );
    expect(screen.getByRole('link', { name: /Recomendado para ti.*Codo de pádel/ })).toHaveAttribute(
      'href',
      '/programas/codo-de-padel',
    );
    expect(screen.getByRole('link', { name: /Registra el dolor/ })).toHaveAttribute('href', '/dolor');
  });

  it('con un programa en curso lleva a la sesión que toca', async () => {
    const state = playerState({
      enrollment: {
        programSlug: 'codo-de-padel',
        currentWeek: 2,
        totalWeeks: 2,
        sessionsDoneThisWeek: 1,
        sessionsPerWeek: 3,
        routineSlug: 'codo-semana-2',
        completed: false,
        startedAt: '2026-11-01T10:00:00Z',
      },
    });
    renderApp(<Home />, await storeWithState(state));

    expect(screen.getByRole('link', { name: /Empezar sesión/ })).toHaveAttribute('href', '/rutina/codo-semana-2');
    expect(screen.getByText(/Semana 2 de 2/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '1 de 3 sesiones esta semana' })).toBeInTheDocument();
  });

  it('marca como hecha la rutina terminada hoy', async () => {
    const state = playerState({
      recentCompletions: [
        { id: 'c-1', routineSlug: 'calentamiento-prepartido', completedAt: new Date().toISOString() },
      ],
    });
    renderApp(<Home />, await storeWithState(state));

    expect(screen.getByRole('link', { name: /Calentamiento prepartido/ })).toHaveTextContent('Hecho');
  });

  it('avisa cuando el dolor pide consultar a un profesional', async () => {
    const state = playerState({
      alerts: [{ zone: 'KNEE', kind: 'HIGH_PAIN', message: 'Rodilla: dolor de 8/10. Para y consulta.' }],
    });
    renderApp(<Home />, await storeWithState(state));

    expect(screen.getByRole('alert')).toHaveTextContent('Rodilla: dolor de 8/10');
  });

  it('al terminar el programa enseña lo conseguido y las dos salidas', async () => {
    const state = playerState({
      enrollment: finishedProgram(),
      pain: [elbowPain('despues', 2, daysAgo(2)), elbowPain('antes', 6, daysAgo(21))],
    });
    renderApp(<Home />, await storeWithState(state));

    const summary = screen.getByRole('region', { name: 'Resumen del programa' });
    expect(summary).toHaveTextContent('¡Programa completado!');
    expect(summary).toHaveTextContent(/Sesiones\s*6/);
    expect(summary).toHaveTextContent(/Antes de empezar\s*6\/10\s*hace 21 días/);
    expect(summary).toHaveTextContent(/Último registro\s*2\/10\s*hace 2 días/);
    expect(summary).toHaveTextContent('Ha bajado de 6 a 2.');
    expect(summary).toHaveTextContent('no una valoración médica');
    expect(summary).toHaveTextContent('Ejercicios en borrador');
    expect(screen.getByRole('link', { name: 'Elegir otra zona' })).toHaveAttribute('href', '/programas');
    expect(screen.getByRole('button', { name: 'Repetir programa' })).toBeInTheDocument();
  });

  it('sin cobertura, al hacer la última sesión sale el resumen con lo guardado en el móvil', async () => {
    const noNetwork = async (): Promise<never> => {
      throw new NetworkError();
    };
    const lastSessionLeft = playerState({
      enrollment: finishedProgram({ sessionsDoneThisWeek: 2, completed: false }),
      pain: [elbowPain('antes', 6, daysAgo(21))],
    });
    const store = await registeredStore(
      fakeApi({
        register: vi.fn(async () => ({ token: 'token-de-prueba', state: lastSessionLeft })),
        me: vi.fn(noNetwork),
        send: vi.fn(noNetwork),
      }),
    );

    store.completeRoutine('codo-semana-2');
    store.logPain('ELBOW', 3);
    renderApp(<Home />, store);

    const summary = await screen.findByRole('region', { name: 'Resumen del programa' });
    expect(summary).toHaveTextContent('Ha bajado de 6 a 3.');
  });
});
