import { describe, expect, it } from 'vitest';
import {
  completedToday,
  daysAgoLabel,
  formatClock,
  formatMinutes,
  formatSeconds,
  streakDays,
} from './derive';
import type { Completion } from './types';

// Fechas en hora local, como las ve el jugador en su móvil.
const NOW = new Date(2026, 10, 10, 19, 30);

function done(routineSlug: string, daysAgo: number, hour = 18): Completion {
  const at = new Date(2026, 10, 10 - daysAgo, hour, 0);
  return { id: `${routineSlug}-${daysAgo}-${hour}`, routineSlug, completedAt: at.toISOString() };
}

describe('rutinas de hoy', () => {
  it('solo cuentan las terminadas hoy', () => {
    const today = completedToday([done('calentamiento', 0), done('recuperacion', 1), done('codo', 0, 8)], NOW);

    expect([...today].sort()).toEqual(['calentamiento', 'codo']);
  });

  it('lo de anoche a última hora ya no es de hoy', () => {
    expect(completedToday([done('calentamiento', 1, 23)], NOW).size).toBe(0);
  });
});

describe('racha de días seguidos', () => {
  it('cuenta los días consecutivos hasta hoy', () => {
    expect(streakDays([done('a', 0), done('b', 1), done('c', 2)], NOW)).toBe(3);
  });

  it('varias rutinas el mismo día cuentan como un día', () => {
    expect(streakDays([done('a', 0, 9), done('b', 0, 18), done('c', 1)], NOW)).toBe(2);
  });

  it('que hoy todavía no haya ninguna no rompe la racha', () => {
    expect(streakDays([done('a', 1), done('b', 2)], NOW)).toBe(2);
  });

  it('un día sin hacer nada la corta', () => {
    expect(streakDays([done('a', 0), done('b', 2), done('c', 3)], NOW)).toBe(1);
    expect(streakDays([done('a', 2)], NOW)).toBe(0);
    expect(streakDays([], NOW)).toBe(0);
  });
});

describe('textos de tiempo', () => {
  it('duración de una rutina en minutos', () => {
    expect(formatMinutes(575)).toBe('10 min');
    expect(formatMinutes(515)).toBe('9 min');
  });

  it('duración de un ejercicio', () => {
    expect(formatSeconds(45)).toBe('45 s');
    expect(formatSeconds(60)).toBe('1 min');
    expect(formatSeconds(90)).toBe('1 min 30 s');
  });

  it('cuenta atrás del reproductor', () => {
    expect(formatClock(9)).toBe('9');
    expect(formatClock(59)).toBe('59');
    expect(formatClock(65)).toBe('1:05');
  });

  it('hace cuánto fue un registro', () => {
    expect(daysAgoLabel(new Date(2026, 10, 10, 8, 0), NOW)).toBe('hoy');
    expect(daysAgoLabel(new Date(2026, 10, 9, 23, 50), NOW)).toBe('ayer');
    expect(daysAgoLabel(new Date(2026, 10, 6, 12, 0), NOW)).toBe('hace 4 días');
  });
});
