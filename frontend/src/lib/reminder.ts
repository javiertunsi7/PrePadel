// Recordatorio ligado al partido: aviso 30 minutos antes de la hora que marca el jugador.

export const LEAD_MINUTES = 30;
/** Tras la hora de inicio, la app pregunta por el partido durante este tiempo. */
const MATCH_WINDOW_HOURS = 3;

/** Próxima vez que el reloj marca esa hora ("19:00"): hoy si aún no ha pasado; si no, mañana. */
export function nextOccurrence(time: string, now: Date): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(now);
  date.setHours(hours, minutes, 0, 0);
  if (date.getTime() <= now.getTime()) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

export function reminderTime(match: Date): Date {
  return new Date(match.getTime() - LEAD_MINUTES * 60_000);
}

/** Milisegundos hasta el aviso, o null si ya ha pasado su hora. */
export function msUntilReminder(match: Date, now: Date): number | null {
  const ms = reminderTime(match).getTime() - now.getTime();
  return ms > 0 ? ms : null;
}

export type MatchMoment = 'before' | 'after' | 'over';

/** Antes del partido, recién jugado (toca recuperar y registrar dolor) o ya pasado. */
export function matchMoment(match: Date, now: Date): MatchMoment {
  if (now.getTime() < match.getTime()) {
    return 'before';
  }
  return now.getTime() < match.getTime() + MATCH_WINDOW_HOURS * 3_600_000 ? 'after' : 'over';
}

/** Muestra el aviso si el jugador dio permiso. Por ahora solo llega con la app abierta. */
export async function notify(title: string, body: string): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  const options = { body, icon: '/icons/icon-192.png', tag: 'prepadel-partido' };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  } catch {
    // notificaciones no disponibles en este navegador
  }
}
