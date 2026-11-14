import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { NetworkError } from '../lib/api';
import type { AppStore } from '../lib/store';
import type { Enrollment } from '../lib/types';
import { fakeApi, playerState, registeredStore, renderApp, storeWithState } from '../test/fixtures';
import { ProgramDetail } from './ProgramDetail';

/** Codo de pádel del catálogo de prueba (2 semanas de 3 sesiones), terminado. */
const finished: Enrollment = {
  programSlug: 'codo-de-padel',
  currentWeek: 2,
  totalWeeks: 2,
  sessionsDoneThisWeek: 3,
  sessionsPerWeek: 3,
  routineSlug: 'codo-semana-2',
  completed: true,
  startedAt: '2026-10-01T10:00:00Z',
};

function renderDetail(store: AppStore) {
  return renderApp(
    <Routes>
      <Route path="/programas/:slug" element={<ProgramDetail />} />
    </Routes>,
    store,
    '/programas/codo-de-padel',
  );
}

describe('ficha del programa', () => {
  it('terminado, enseña el resumen y, sin registros de dolor, dice que no hay con qué comparar', async () => {
    renderDetail(await storeWithState(playerState({ enrollment: finished })));

    const summary = screen.getByRole('region', { name: 'Resumen del programa' });
    expect(summary).toHaveTextContent(/Sesiones\s*6/);
    expect(summary).toHaveTextContent(/Antes de empezar\s*Sin registro/);
    expect(summary).toHaveTextContent(/Último registro\s*Sin registro/);
    expect(summary).toHaveTextContent('No hay registros suficientes para comparar.');
    expect(summary).toHaveTextContent('Ejercicios en borrador');
    expect(screen.getByRole('link', { name: 'Elegir otra zona' })).toHaveAttribute('href', '/programas');
  });

  it('si el dolor ha subido lo dice tal cual y recuerda cuándo consultar', async () => {
    const state = playerState({
      enrollment: finished,
      pain: [
        { id: 'despues', zone: 'ELBOW', score: 5, context: 'POST_MATCH', recordedAt: '2026-11-10T19:00:00Z' },
        { id: 'antes', zone: 'ELBOW', score: 2, context: 'ONBOARDING', recordedAt: '2026-09-30T10:00:00Z' },
      ],
    });
    renderDetail(await storeWithState(state));

    const summary = screen.getByRole('region', { name: 'Resumen del programa' });
    expect(summary).toHaveTextContent('Ha subido de 2 a 5.');
    expect(summary).toHaveTextContent('para y consulta');
  });

  it('repetir el programa vuelve a la semana 1, también sin cobertura', async () => {
    const noNetwork = async (): Promise<never> => {
      throw new NetworkError();
    };
    const store = await registeredStore(
      fakeApi({
        register: vi.fn(async () => ({ token: 'token-de-prueba', state: playerState({ enrollment: finished }) })),
        me: vi.fn(noNetwork),
        send: vi.fn(noNetwork),
      }),
    );
    renderDetail(store);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Repetir programa' }));

    expect(await screen.findByRole('link', { name: 'Empezar sesión · semana 1' })).toHaveAttribute(
      'href',
      '/rutina/codo-semana-1',
    );
    expect(screen.queryByRole('region', { name: 'Resumen del programa' })).not.toBeInTheDocument();
  });
});
