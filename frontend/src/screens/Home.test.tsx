import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { formatTime } from '../lib/derive';
import { fakeApi, playerState, registeredStore, renderApp, storeWithState } from '../test/fixtures';
import { Home } from './Home';

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
