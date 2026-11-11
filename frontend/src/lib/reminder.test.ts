import { describe, expect, it } from 'vitest';
import { matchMoment, msUntilReminder, nextOccurrence, reminderTime } from './reminder';

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
