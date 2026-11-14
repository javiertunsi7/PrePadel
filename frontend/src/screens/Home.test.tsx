import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { NetworkError, type Api } from '../lib/api';
import { formatTime } from '../lib/derive';
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

describe('partidos con aviso', () => {
  /** Dentro de `days` días a esa hora, en la hora local del móvil. */
  const inDays = (days: number, hours: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hours, 0, 0, 0);
    return date;
  };
  const weekday = (date: Date) => date.toLocaleDateString('es-ES', { weekday: 'long' });
  const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

  async function addMatch(user: ReturnType<typeof userEvent.setup>, day: string, time: string) {
    const form = screen.getByRole('form', { name: 'Nuevo partido' });
    await user.selectOptions(within(form).getByRole('combobox', { name: 'Día del partido' }), day);
    await user.type(within(form).getByLabelText('Hora del partido'), time);
    await user.click(within(form).getByRole('checkbox', { name: /todas las semanas/ }));
    await user.click(within(form).getByRole('button', { name: 'Avisarme' }));
  }

  it('con dos partidos semanales en días distintos, lista los dos y deja quitar uno', async () => {
    const user = userEvent.setup();
    const store = await registeredStore(fakeApi());
    renderApp(<Home />, store);
    const thursday = inDays(3, 20);

    await addMatch(user, 'Mañana', '19:00');
    const list = screen.getByRole('region', { name: 'Tu partido' });
    expect(within(list).getByText('Mañana a las 19:00')).toBeInTheDocument();
    expect(within(list).getByText('Aviso a las 18:30 · cada semana')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Nuevo partido' })).not.toBeInTheDocument();

    await user.click(within(list).getByRole('button', { name: 'Añadir otro partido' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('form', { name: 'Nuevo partido' })).not.toBeInTheDocument();
    await user.click(within(list).getByRole('button', { name: 'Añadir otro partido' }));
    await addMatch(user, capitalized(weekday(thursday)), '20:00');

    const both = screen.getByRole('region', { name: 'Tus partidos' });
    expect(within(both).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Mañana a las 19:00Aviso a las 18:30 · cada semanaQuitar',
      `El ${weekday(thursday)} a las 20:00Aviso a las 19:30 · cada semanaQuitar`,
    ]);
    expect(store.getState().matches).toMatchObject([
      { at: inDays(1, 19).toISOString(), weekly: true },
      { at: thursday.toISOString(), weekly: true },
    ]);

    await user.click(within(both).getByRole('button', { name: 'Quitar el partido de mañana a las 19:00' }));
    expect(within(screen.getByRole('region', { name: 'Tu partido' })).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(`El ${weekday(thursday)} a las 20:00`)).toBeInTheDocument();
  });

  it('después de cada partido toca recuperar; el semanal vuelve a la lista para la semana que viene', async () => {
    const user = userEvent.setup();
    const store = await registeredStore(fakeApi());
    const minutesAgo = (minutes: number) => new Date(Math.floor(Date.now() / 60_000) * 60_000 - minutes * 60_000);
    const weekly = minutesAgo(60);
    const once = minutesAgo(120);
    store.addMatch(weekly.toISOString(), true);
    store.addMatch(once.toISOString());
    renderApp(<Home />, store);

    const weeklyCard = screen.getByRole('region', { name: `Partido de las ${formatTime(weekly)}` });
    const onceCard = screen.getByRole('region', { name: `Partido de las ${formatTime(once)}` });
    for (const card of [weeklyCard, onceCard]) {
      expect(within(card).getByRole('link', { name: 'Registrar dolor' })).toHaveAttribute('href', '/dolor');
    }

    await user.click(within(onceCard).getByRole('button', { name: 'Listo' }));
    expect(onceCard).not.toBeInTheDocument();
    await user.click(within(weeklyCard).getByRole('button', { name: 'Listo' }));

    const nextWeek = new Date(weekly);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const list = screen.getByRole('region', { name: 'Tu partido' });
    expect(within(list).getByText(`El ${weekday(nextWeek)} a las ${formatTime(weekly)}`)).toBeInTheDocument();
    expect(store.getState().matches).toMatchObject([{ at: nextWeek.toISOString(), weekly: true }]);
  });

  it('con cuatro partidos ya no deja añadir otro', async () => {
    const store = await registeredStore(fakeApi());
    for (const days of [1, 2, 3, 4]) {
      store.addMatch(inDays(days, 19).toISOString(), true);
    }
    renderApp(<Home />, store);

    const list = screen.getByRole('region', { name: 'Tus partidos' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
    expect(within(list).getByText(/Como mucho 4 partidos/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Añadir otro partido' })).not.toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Nuevo partido' })).not.toBeInTheDocument();
  });
});
