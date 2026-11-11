import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fakeApi, playerState, registeredStore, renderApp, storeWithState } from '../test/fixtures';
import { Pain } from './Pain';

describe('registro de dolor', () => {
  it('un toque guarda el dolor de esa zona', async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    renderApp(<Pain />, await registeredStore(api));

    const knee = screen.getByRole('radiogroup', { name: 'Dolor en Rodilla' });
    await user.click(within(knee).getByRole('radio', { name: /^4 de 10/ }));

    expect(api.send).toHaveBeenCalledExactlyOnceWith(
      'token-de-prueba',
      '/me/pain',
      expect.objectContaining({ zone: 'KNEE', score: 4, context: 'POST_MATCH' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Guardado');
  });

  it('enseña el último registro de cada zona y marca el de hoy', async () => {
    const state = playerState({
      pain: [
        { id: 'p-2', zone: 'ELBOW', score: 3, context: 'POST_MATCH', recordedAt: new Date().toISOString() },
        { id: 'p-1', zone: 'ELBOW', score: 6, context: 'ONBOARDING', recordedAt: '2026-01-05T10:00:00Z' },
      ],
    });
    renderApp(<Pain />, await storeWithState(state));

    expect(screen.getByText('3/10 · hoy')).toBeInTheDocument();
    const elbow = screen.getByRole('radiogroup', { name: 'Dolor en Codo' });
    expect(within(elbow).getByRole('radio', { name: /^3 de 10/ })).toBeChecked();
    expect(screen.getByRole('img', { name: /del más antiguo al más reciente: 6, 3/ })).toBeInTheDocument();

    const knee = screen.getByRole('radiogroup', { name: 'Dolor en Rodilla' });
    expect(within(knee).queryByRole('radio', { checked: true })).not.toBeInTheDocument();
  });

  it('explica cuándo hay que parar y consultar, con los umbrales del servidor', async () => {
    renderApp(<Pain />, await registeredStore(fakeApi()));

    expect(
      screen.getByText(/Si el dolor llega a 7\/10, o se mantiene en 4\/10 o más durante 10 días/),
    ).toBeInTheDocument();
  });
});
