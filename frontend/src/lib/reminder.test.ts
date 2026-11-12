import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchMoment, msUntilReminder, nextOccurrence, pushSubscription, reminderTime } from './reminder';

const at = (hours: number, minutes: number, day = 10) => new Date(2026, 10, day, hours, minutes);

describe('recordatorio ligado al partido', () => {
  it('la hora del partido es hoy si aún no ha pasado', () => {
    expect(nextOccurrence('19:00', at(16, 0))).toEqual(at(19, 0));
  });

  it('si esa hora ya ha pasado, el partido es mañana', () => {
    expect(nextOccurrence('09:30', at(16, 0))).toEqual(at(9, 30, 11));
    expect(nextOccurrence('16:00', at(16, 0))).toEqual(at(16, 0, 11));
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
