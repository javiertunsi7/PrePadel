import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
