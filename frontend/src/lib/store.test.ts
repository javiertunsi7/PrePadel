import { describe, expect, it, vi } from 'vitest';
import { fakeApi, playerState, registeredStore } from '../test/fixtures';
import { ApiError, NetworkError, type Api } from './api';
import { AppStore } from './store';

const noNetwork = async (): Promise<never> => {
  throw new NetworkError();
};

describe('sin cobertura', () => {
  it('la rutina terminada se ve al instante y queda en cola en el móvil', async () => {
    const store = await registeredStore(fakeApi({ send: vi.fn(noNetwork) }));

    store.completeRoutine('calentamiento-prepartido');
    expect(store.getState().me?.recentCompletions).toHaveLength(1);

    await store.sync();
    const state = store.getState();
    expect(state.offline).toBe(true);
    expect(state.outbox).toHaveLength(1);
    expect(state.me?.recentCompletions[0].routineSlug).toBe('calentamiento-prepartido');
    expect(JSON.parse(localStorage.getItem('prepadel.outbox') ?? '[]')).toHaveLength(1);
  });

  it('al volver la cobertura se envía todo en orden y manda lo que diga el servidor', async () => {
    let online = false;
    const fromServer = playerState({
      recentCompletions: [
        { id: 'del-servidor', routineSlug: 'calentamiento-prepartido', completedAt: '2026-11-10T18:00:00Z' },
      ],
    });
    const send = vi.fn<Api['send']>(async () => {
      if (!online) {
        throw new NetworkError();
      }
      return fromServer;
    });
    const store = await registeredStore(fakeApi({ send }));

    store.completeRoutine('calentamiento-prepartido');
    store.logPain('ELBOW', 3);
    await store.sync();
    expect(store.getState().outbox).toHaveLength(2);

    online = true;
    send.mockClear();
    await store.sync();

    expect(send.mock.calls.map(([, path]) => path)).toEqual(['/me/completions', '/me/pain']);
    expect(store.getState().outbox).toEqual([]);
    expect(store.getState().offline).toBe(false);
    expect(store.getState().me).toEqual(fromServer);
  });

  it('la cola sobrevive a cerrar y volver a abrir la app', async () => {
    const store = await registeredStore(fakeApi({ send: vi.fn(noNetwork) }));
    store.logPain('KNEE', 5);
    await store.sync();

    const api = fakeApi();
    const reopened = new AppStore(api);
    expect(reopened.getState().outbox).toHaveLength(1);
    expect(reopened.getState().me?.pain[0]).toMatchObject({ zone: 'KNEE', score: 5 });

    await reopened.sync();
    expect(api.send).toHaveBeenCalledWith(
      'token-de-prueba',
      '/me/pain',
      expect.objectContaining({ zone: 'KNEE', score: 5, context: 'POST_MATCH' }),
    );
    expect(reopened.getState().outbox).toEqual([]);
  });

  it('sin catálogo nuevo sigue valiendo el que ya estaba guardado', async () => {
    const store = await registeredStore(fakeApi());
    const reopened = new AppStore(fakeApi({ content: vi.fn(noNetwork), me: vi.fn(noNetwork) }));

    await reopened.sync();
    expect(reopened.getState().content).toEqual(store.getState().content);
    expect(reopened.getState().me).toEqual(store.getState().me);
    expect(reopened.getState().offline).toBe(true);
  });
});

describe('respuestas del servidor', () => {
  it('una acción rechazada (4xx) se descarta y no bloquea a las siguientes', async () => {
    const send = vi.fn<Api['send']>(async (_token, path) => {
      if (path === '/me/pain') {
        throw new ApiError(400, 'Zona desconocida');
      }
      return playerState();
    });
    const store = await registeredStore(fakeApi({ send }));

    store.logPain('CUELLO', 3);
    store.completeRoutine('calentamiento-prepartido');
    await store.sync();

    expect(send.mock.calls.map(([, path]) => path)).toEqual(['/me/pain', '/me/completions']);
    expect(store.getState().outbox).toEqual([]);
  });

  it('si el servidor ya no conoce al jugador (401) la app vuelve al cuestionario', async () => {
    const unknownPlayer = async (): Promise<never> => {
      throw new ApiError(401, 'Token no válido');
    };
    const store = await registeredStore(fakeApi({ me: vi.fn(unknownPlayer) }));

    await store.sync();

    expect(store.getState()).toMatchObject({ token: null, me: null, outbox: [] });
    expect(localStorage.getItem('prepadel.token')).toBeNull();
    expect(localStorage.getItem('prepadel.me')).toBeNull();
  });
});

describe('cuenta y ajustes', () => {
  it('el cuestionario guarda el token y el estado en el móvil', async () => {
    const store = await registeredStore(fakeApi());

    expect(store.getState().token).toBe('token-de-prueba');
    expect(new AppStore(fakeApi()).getState().me).toEqual(playerState());
  });

  it('borrar la cuenta la elimina del servidor y limpia el móvil', async () => {
    const api = fakeApi();
    const store = await registeredStore(api);
    store.setMatch('2026-11-11T19:00:00.000Z');

    await store.deleteAccount();

    expect(api.deleteMe).toHaveBeenCalledWith('token-de-prueba');
    expect(store.getState()).toMatchObject({ token: null, me: null, matchAt: null });
    expect(localStorage.getItem('prepadel.me')).toBeNull();
  });

  it('sin conexión la cuenta no se borra: los datos siguen en el servidor y en el móvil', async () => {
    const store = await registeredStore(fakeApi({ deleteMe: vi.fn(noNetwork) }));

    await expect(store.deleteAccount()).rejects.toBeInstanceOf(NetworkError);
    expect(store.getState().token).toBe('token-de-prueba');
  });

  it('recuerda si el jugador quiere la voz', async () => {
    const store = await registeredStore(fakeApi());
    store.setVoice(false);

    expect(new AppStore(fakeApi()).getState().settings.voice).toBe(false);
  });
});
