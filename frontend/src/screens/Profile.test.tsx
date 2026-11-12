import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetworkError } from '../lib/api';
import { fakeApi, registeredStore, renderApp } from '../test/fixtures';
import { Profile } from './Profile';

describe('perfil: tus datos', () => {
  afterEach(() => vi.restoreAllMocks());

  it('descarga en un fichero todo lo que el servidor guarda del jugador', async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    renderApp(<Profile />, await registeredStore(api), '/perfil');
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:prueba');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await user.click(screen.getByRole('button', { name: 'Descargar mis datos' }));

    expect(api.exportMe).toHaveBeenCalledWith('token-de-prueba');
    const blob = createUrl.mock.calls[0][0] as Blob;
    expect(JSON.parse(await blob.text())).toEqual({ profile: { age: 47 }, pain: [] });
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('prepadel-mis-datos.json');
  });

  it('sin conexión lo explica', async () => {
    const user = userEvent.setup();
    const api = fakeApi({ exportMe: vi.fn(async () => Promise.reject(new NetworkError())) });
    renderApp(<Profile />, await registeredStore(api), '/perfil');

    await user.click(screen.getByRole('button', { name: 'Descargar mis datos' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Hace falta conexión');
  });
});
