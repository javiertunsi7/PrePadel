import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  matchMoment,
  msUntilReminder,
  nextOccurrence,
  nextWeeklyMatch,
  pendingReminders,
  pushSubscription,
  reminderTime,
} from './reminder';

// Noviembre de 2026: el día 10 es martes.
const at = (hours: number, minutes: number, day = 10) => new Date(2026, 10, day, hours, minutes);

describe('recordatorio ligado al partido', () => {
  it('la hora del partido es hoy si aún no ha pasado', () => {
    expect(nextOccurrence('19:00', at(16, 0))).toEqual(at(19, 0));
  });

  it('si esa hora ya ha pasado, el partido es mañana', () => {
    expect(nextOccurrence('09:30', at(16, 0))).toEqual(at(9, 30, 11));
    expect(nextOccurrence('16:00', at(16, 0))).toEqual(at(16, 0, 11));
  });

  it('se puede marcar otro día de la semana', () => {
    expect(nextOccurrence('09:30', at(16, 0), 1)).toEqual(at(9, 30, 11));
    expect(nextOccurrence('20:00', at(16, 0), 6)).toEqual(at(20, 0, 16));
  });

  it('el semanal de hoy a una hora que ya ha pasado empieza la semana que viene, no mañana', () => {
    expect(nextOccurrence('09:30', at(16, 0), 0, true)).toEqual(at(9, 30, 17));
    expect(nextOccurrence('19:00', at(16, 0), 0, true)).toEqual(at(19, 0, 10));
  });

  it('el aviso llega 30 minutos antes del partido', () => {
    expect(reminderTime(at(19, 0))).toEqual(at(18, 30));
    expect(msUntilReminder(at(19, 0), at(18, 0))).toBe(30 * 60_000);
  });

  it('no se programa un aviso cuya hora ya ha pasado', () => {
    expect(msUntilReminder(at(19, 0), at(18, 30))).toBeNull();
    expect(msUntilReminder(at(19, 0), at(18, 45))).toBeNull();
  });

  it('distingue antes del partido, recién jugado y ya pasado', () => {
    expect(matchMoment(at(19, 0), at(18, 59))).toBe('before');
    expect(matchMoment(at(19, 0), at(19, 0))).toBe('after');
    expect(matchMoment(at(19, 0), at(21, 59))).toBe('after');
    expect(matchMoment(at(19, 0), at(22, 0))).toBe('over');
  });
});

describe('suscripción a los avisos con la app cerrada', () => {
  afterEach(() => vi.unstubAllGlobals());

  const browser = (permission: NotificationPermission, subscribe = vi.fn()) => {
    vi.stubGlobal('Notification', { permission, requestPermission: vi.fn(async () => permission) });
    vi.stubGlobal('PushManager', class {});
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: async () => ({ pushManager: { getSubscription: async () => null, subscribe } }),
      },
    });
    return subscribe;
  };

  it('con permiso suscribe el móvil con la clave del servidor y devuelve a dónde avisar', async () => {
    const subscribe = browser(
      'granted',
      vi.fn(async () => ({
        toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'clave', auth: 'secreto' } }),
      })),
    );

    await expect(pushSubscription('AQID')).resolves.toEqual({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      p256dh: 'clave',
      auth: 'secreto',
    });
    expect(subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: new Uint8Array([1, 2, 3]) });
  });

  it('sin permiso, sin clave o sin soporte no suscribe y la app sigue como antes', async () => {
    const denied = browser('denied');
    await expect(pushSubscription('AQID')).resolves.toBeNull();
    expect(denied).not.toHaveBeenCalled();

    const noKey = browser('granted');
    await expect(pushSubscription(null)).resolves.toBeNull();
    expect(noKey).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
    await expect(pushSubscription('AQID')).resolves.toBeNull();
  });
});

describe('partido semanal', () => {
  it('pasado el partido, el siguiente es el mismo día y hora de la semana que viene', () => {
    expect(nextWeeklyMatch(at(19, 0, 10), at(23, 0, 10))).toEqual(at(19, 0, 17));
  });

  it('mientras toca recuperar sigue siendo el de hoy', () => {
    expect(nextWeeklyMatch(at(19, 0, 10), at(20, 0, 10))).toEqual(at(19, 0, 10));
  });

  it('si la app lleva semanas sin abrirse, salta hasta el próximo que no haya pasado', () => {
    expect(nextWeeklyMatch(at(19, 0, 1), at(12, 0, 20))).toEqual(at(19, 0, 22));
  });
});

describe('dos partidos semanales en días distintos', () => {
  const monday = at(12, 0, 9);
  const tuesday = at(19, 0, 10);
  const thursday = at(20, 0, 12);

  it('el lunes se marcan el del martes y el del jueves', () => {
    expect(nextOccurrence('19:00', monday, 1, true)).toEqual(tuesday);
    expect(nextOccurrence('20:00', monday, 3, true)).toEqual(thursday);
  });

  it('cada uno avisa 30 minutos antes de su hora, con la app abierta', () => {
    const matches = [{ at: tuesday.toISOString() }, { at: thursday.toISOString() }];
    const until = (reminder: Date, now: Date) => reminder.getTime() - now.getTime();

    expect(pendingReminders(matches, monday)).toEqual([until(at(18, 30, 10), monday), until(at(19, 30, 12), monday)]);
    // Pasado el aviso del martes solo queda el del jueves.
    expect(pendingReminders(matches, at(18, 45, 10))).toEqual([until(at(19, 30, 12), at(18, 45, 10))]);
    expect(pendingReminders(matches, at(19, 45, 12))).toEqual([]);
  });

  it('jugados los dos, cada uno pasa a su mismo día y hora de la semana siguiente', () => {
    const friday = at(12, 0, 13);
    expect(nextWeeklyMatch(tuesday, friday)).toEqual(at(19, 0, 17));
    expect(nextWeeklyMatch(thursday, friday)).toEqual(at(20, 0, 19));
  });
});
