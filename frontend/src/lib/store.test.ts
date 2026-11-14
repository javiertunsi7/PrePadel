import { describe, expect, it, vi } from 'vitest';
import { answers, content, fakeApi, playerState, registeredStore } from '../test/fixtures';
import { ApiError, NetworkError, type Api } from './api';
import { MAX_MATCHES } from './reminder';
import { AppStore, LEGACY_MATCH_ID } from './store';

const noNetwork = async (): Promise<never> => {
  throw new NetworkError();
};

describe('enlace de club', () => {
  it('el club viaja con el cuestionario y después se olvida', async () => {
    localStorage.setItem('prepadel.club', JSON.stringify('padel-elche'));
    const api = fakeApi();

    await new AppStore(api).register(answers);

    expect(api.register).toHaveBeenCalledExactlyOnceWith({ ...answers, club: 'padel-elche' });
    expect(localStorage.getItem('prepadel.club')).toBeNull();
  });

  it('si el alta falla, el club sigue guardado para el siguiente intento', async () => {
    localStorage.setItem('prepadel.club', JSON.stringify('padel-elche'));
    const store = new AppStore(fakeApi({ register: vi.fn(noNetwork) }));

    await expect(store.register(answers)).rejects.toThrow(NetworkError);

    expect(localStorage.getItem('prepadel.club')).toBe('"padel-elche"');
  });
});

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
    store.addMatch('2026-11-11T19:00:00.000Z');

    await store.deleteAccount();

    expect(api.deleteMe).toHaveBeenCalledWith('token-de-prueba');
    expect(store.getState()).toMatchObject({ token: null, me: null, matches: [] });
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

describe('partidos con aviso', () => {
  const target = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', p256dh: 'clave', auth: 'secreto' };
  const withPush = () => fakeApi({ content: vi.fn(async () => ({ ...content, pushPublicKey: 'clave-publica' })) });
  // Noviembre de 2026: el 17 es martes y el 19, jueves.
  const tuesday = '2026-11-17T18:00:00.000Z';
  const thursday = '2026-11-19T19:00:00.000Z';

  it('manda al servidor el partido con su id, la hora y la suscripción del móvil', async () => {
    const api = withPush();
    const store = await registeredStore(api);

    const id = store.addMatch(tuesday) ?? '';
    store.remindWhenClosed(id, target);

    expect(store.getState().matches).toEqual([{ id, at: tuesday, weekly: false, remote: true }]);
    await vi.waitFor(() =>
      expect(api.send).toHaveBeenCalledWith('token-de-prueba', '/me/matches', {
        id,
        matchAt: tuesday,
        weekly: false,
        timeZone: expect.any(String),
        subscription: target,
      }),
    );
  });

  it('dos partidos semanales en días distintos van al servidor cada uno con su id y se quitan por separado', async () => {
    const api = withPush();
    const store = await registeredStore(api);

    const thursdayId = store.addMatch(thursday, true) ?? '';
    const tuesdayId = store.addMatch(tuesday, true) ?? '';
    store.remindWhenClosed(tuesdayId, target);
    store.remindWhenClosed(thursdayId, target);

    expect(store.getState().matches.map((match) => match.at)).toEqual([tuesday, thursday]);
    await vi.waitFor(() => expect(store.getState().outbox).toEqual([]));
    expect(vi.mocked(api.send).mock.calls.map(([, path, body]) => [path, body])).toEqual([
      ['/me/matches', expect.objectContaining({ id: tuesdayId, matchAt: tuesday, weekly: true })],
      ['/me/matches', expect.objectContaining({ id: thursdayId, matchAt: thursday, weekly: true })],
    ]);

    store.removeMatch(tuesdayId);

    expect(store.getState().matches).toEqual([{ id: thursdayId, at: thursday, weekly: true, remote: true }]);
    await vi.waitFor(() => expect(api.remove).toHaveBeenCalledWith('token-de-prueba', `/me/matches/${tuesdayId}`));
    expect(new AppStore(fakeApi()).getState().matches).toEqual(store.getState().matches);
  });

  it('pasados, cada semanal salta a su día de la semana que viene y el suelto se quita', async () => {
    const api = withPush();
    const store = await registeredStore(api);
    const tuesdayId = store.addMatch(tuesday, true) ?? '';
    const thursdayId = store.addMatch(thursday, true) ?? '';
    const wednesday = store.addMatch('2026-11-18T19:00:00.000Z') ?? '';
    store.remindWhenClosed(wednesday, target);

    store.settleMatches(new Date('2026-11-20T12:00:00.000Z'));

    expect(store.getState().matches).toEqual([
      { id: tuesdayId, at: '2026-11-24T18:00:00.000Z', weekly: true, remote: false },
      { id: thursdayId, at: '2026-11-26T19:00:00.000Z', weekly: true, remote: false },
    ]);
    await vi.waitFor(() => expect(api.remove).toHaveBeenCalledWith('token-de-prueba', `/me/matches/${wednesday}`));
  });

  it('al decir "Listo", el semanal pasa a la semana que viene y el suelto se quita', async () => {
    const store = await registeredStore(fakeApi());
    const tuesdayId = store.addMatch(tuesday, true) ?? '';
    const wednesday = store.addMatch('2026-11-18T19:00:00.000Z') ?? '';

    store.finishMatch(tuesdayId);
    store.finishMatch(wednesday);

    expect(store.getState().matches).toEqual([
      { id: tuesdayId, at: '2026-11-24T18:00:00.000Z', weekly: true, remote: false },
    ]);
  });

  it('no caben más de cuatro partidos ni dos a la misma hora', async () => {
    const store = await registeredStore(fakeApi());

    expect(store.addMatch(tuesday)).not.toBeNull();
    expect(store.addMatch('2026-11-17T19:00:00+01:00')).toBeNull();
    for (const at of [thursday, '2026-11-20T18:00:00.000Z', '2026-11-21T09:00:00.000Z']) {
      expect(store.addMatch(at)).not.toBeNull();
    }
    expect(store.addMatch('2026-11-22T10:00:00.000Z')).toBeNull();
    expect(store.getState().matches).toHaveLength(MAX_MATCHES);
  });

  it('si el jugador ya quitó el partido, una suscripción que llega tarde no lo vuelve a programar', async () => {
    const api = withPush();
    const store = await registeredStore(api);

    const id = store.addMatch(tuesday) ?? '';
    store.removeMatch(id);
    store.remindWhenClosed(id, target);

    expect(store.getState()).toMatchObject({ matches: [], outbox: [] });
    expect(api.send).not.toHaveBeenCalled();
    expect(api.remove).not.toHaveBeenCalled();
  });

  it('un móvil de cuando solo cabía un partido lo conserva y envía lo que tenía en la cola', async () => {
    await registeredStore(fakeApi());
    localStorage.removeItem('prepadel.matches');
    localStorage.setItem('prepadel.match', JSON.stringify(tuesday));
    localStorage.setItem('prepadel.match-options', JSON.stringify({ weekly: true, remote: true }));
    localStorage.setItem(
      'prepadel.outbox',
      JSON.stringify([{ kind: 'reminder', id: 'r-1', matchAt: tuesday, subscription: target, weekly: true }]),
    );

    const api = fakeApi();
    const updated = new AppStore(api);

    expect(updated.getState().matches).toEqual([{ id: LEGACY_MATCH_ID, at: tuesday, weekly: true, remote: true }]);
    expect(localStorage.getItem('prepadel.match')).toBeNull();
    expect(new AppStore(fakeApi()).getState().matches).toEqual(updated.getState().matches);

    await updated.sync();
    expect(api.send).toHaveBeenCalledWith('token-de-prueba', '/me/reminder', {
      matchAt: tuesday,
      subscription: target,
      weekly: true,
      timeZone: null,
    });

    // Es el mismo partido que el servidor guardó con el id nulo: se quita por la ruta nueva.
    updated.removeMatch(LEGACY_MATCH_ID);
    await vi.waitFor(() =>
      expect(api.remove).toHaveBeenCalledWith('token-de-prueba', '/me/matches/00000000-0000-0000-0000-000000000000'),
    );
  });
});
