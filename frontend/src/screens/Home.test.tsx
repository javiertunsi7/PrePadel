import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { NetworkError, type Api } from '../lib/api';
import type { Enrollment, PainAlert, PainEntry } from '../lib/types';
import { fakeApi, playerState, registeredStore, renderApp, storeWithState } from '../test/fixtures';
import { Home } from './Home';
import { Pain } from './Pain';

const elbowProgram: Enrollment = {
  programSlug: 'codo-de-padel',
  currentWeek: 2,
  totalWeeks: 2,
  sessionsDoneThisWeek: 1,
  sessionsPerWeek: 3,
  routineSlug: 'codo-semana-2',
  completed: false,
  startedAt: '2026-11-01T10:00:00Z',
};

const elbowStop: PainAlert = { zone: 'ELBOW', kind: 'HIGH_PAIN', message: 'Codo: dolor de 8/10. Para y consulta.' };

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

  it('si el dolor de la zona del programa pide parar, el programa queda en pausa', async () => {
    renderApp(<Home />, await storeWithState(playerState({ enrollment: elbowProgram, alerts: [elbowStop] })));

    expect(screen.queryByRole('link', { name: /Empezar sesión/ })).not.toBeInTheDocument();
    expect(screen.getByText('Programa en pausa.').parentElement).toHaveTextContent(
      /Consulta con un fisioterapeuta o médico\. Cuando el dolor baje, regístralo/,
    );
    expect(screen.getByRole('link', { name: 'Registrar dolor' })).toHaveAttribute('href', '/dolor');
  });

  it('el dolor de otra zona, o el que solo recomienda consultar, no pausa el programa', async () => {
    const state = playerState({
      enrollment: elbowProgram,
      alerts: [
        { zone: 'KNEE', kind: 'HIGH_PAIN', message: 'Rodilla: dolor de 8/10. Para y consulta.' },
        { zone: 'ELBOW', kind: 'PERSISTENT_PAIN', message: 'Codo: llevas días con molestias. Consulta.' },
      ],
    });
    renderApp(<Home />, await storeWithState(state));

    expect(screen.getByRole('link', { name: /Empezar sesión/ })).toHaveAttribute('href', '/rutina/codo-semana-2');
    expect(screen.queryByText('Programa en pausa.')).not.toBeInTheDocument();
  });

  it.each([
    ['con cobertura', async () => playerState({ enrollment: elbowProgram })],
    [
      'sin cobertura',
      async () => {
        throw new NetworkError();
      },
    ],
  ])('al registrar que el dolor ha bajado, el programa se reanuda (%s)', async (_, server: Api['send']) => {
    const user = userEvent.setup();
    const paused = playerState({ enrollment: elbowProgram, alerts: [elbowStop] });
    const store = await registeredStore(
      fakeApi({
        register: vi.fn(async () => ({ token: 'token-de-prueba', state: paused })),
        me: vi.fn(async () => paused),
        send: vi.fn(server),
      }),
    );
    renderApp(
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/dolor"
          element={
            <>
              <Pain />
              <Link to="/">Inicio</Link>
            </>
          }
        />
      </Routes>,
      store,
    );

    await user.click(screen.getByRole('link', { name: 'Registrar dolor' }));
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Dolor en Codo' })).getByRole('radio', { name: /^3 de 10/ }),
    );
    await user.click(screen.getByRole('link', { name: 'Inicio' }));

    expect(await screen.findByRole('link', { name: /Empezar sesión/ })).toHaveAttribute(
      'href',
      '/rutina/codo-semana-2',
    );
    expect(screen.queryByText('Programa en pausa.')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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
