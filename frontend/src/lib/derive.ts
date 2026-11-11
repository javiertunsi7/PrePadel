import type { Completion } from './types';

// "Hoy" es el día del móvil del jugador, no el del servidor: por eso se calcula aquí.

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Rutinas (slug) terminadas hoy. */
export function completedToday(completions: Completion[], now: Date): Set<string> {
  return new Set(
    completions
      .filter((completion) => sameDay(new Date(completion.completedAt), now))
      .map((completion) => completion.routineSlug),
  );
}

/** Días seguidos con alguna rutina hecha. Que hoy aún no haya ninguna no rompe la racha. */
export function streakDays(completions: Completion[], now: Date): number {
  const activeDays = new Set(completions.map((completion) => dayKey(new Date(completion.completedAt))));
  const cursor = new Date(now);
  if (!activeDays.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (activeDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function formatMinutes(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

/** Duración de un ejercicio: "45 s", "1 min", "1 min 30 s". */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} s`;
  }
  const rest = seconds % 60;
  return rest === 0 ? `${seconds / 60} min` : `${Math.floor(seconds / 60)} min ${rest} s`;
}

/** Cuenta atrás: "45" por debajo del minuto, "1:05" por encima. */
export function formatClock(seconds: number): string {
  if (seconds < 60) {
    return String(seconds);
  }
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function daysAgoLabel(date: Date, now: Date): string {
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days <= 0) {
    return 'hoy';
  }
  return days === 1 ? 'ayer' : `hace ${days} días`;
}
