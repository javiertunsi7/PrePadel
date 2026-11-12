// Recordatorio ligado al partido: aviso 30 minutos antes de la hora que marca el jugador.
// Con la app abierta lo lanza la propia app; con la app cerrada lo manda el servidor.

import type { PushTarget } from './types';

export const LEAD_MINUTES = 30;
/** Tras la hora de inicio, la app pregunta por el partido durante este tiempo. */
const MATCH_WINDOW_HOURS = 3;
/** A partir de aquí el partido se da por pasado. */
export const MATCH_OVER_MS = MATCH_WINDOW_HOURS * 3_600_000;

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

/** Partido semanal: el mismo día y a la misma hora (de reloj) de la próxima semana que aún no haya pasado. */
export function nextWeeklyMatch(match: Date, now: Date): Date {
  const next = new Date(match);
  while (matchMoment(next, now) === 'over') {
    next.setDate(next.getDate() + 7);
  }
  return next;
}

export type MatchMoment = 'before' | 'after' | 'over';

/** Antes del partido, recién jugado (toca recuperar y registrar dolor) o ya pasado. */
export function matchMoment(match: Date, now: Date): MatchMoment {
  if (now.getTime() < match.getTime()) {
    return 'before';
  }
  return now.getTime() < match.getTime() + MATCH_WINDOW_HOURS * 3_600_000 ? 'after' : 'over';
}

/**
 * Pide permiso de notificaciones (si aún no se ha decidido) y suscribe este móvil
 * a los avisos con la app cerrada. Devuelve null si no se puede: sin permiso, sin
 * clave del servidor o en un navegador que no lo admite (en iPhone hace falta
 * tener la app instalada en la pantalla de inicio). El aviso con la app abierta
 * sigue funcionando igual.
 */
export async function pushSubscription(publicKey: string | null | undefined): Promise<PushTarget | null> {
  if (!('Notification' in window)) {
    return null;
  }
  try {
    // Lo primero, sin esperas antes: el navegador solo deja pedir permiso justo tras un toque.
    const permission =
      Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission !== 'granted' || !publicKey || !('PushManager' in window)) {
      return null;
    }
    const registration = await navigator.serviceWorker?.getRegistration();
    if (!registration) {
      return null;
    }
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: fromBase64Url(publicKey),
      }));
    const { endpoint, keys } = subscription.toJSON();
    return endpoint && keys?.p256dh && keys?.auth ? { endpoint, p256dh: keys.p256dh, auth: keys.auth } : null;
  } catch {
    return null;
  }
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

/** Muestra el aviso con la app abierta, si el jugador dio permiso. */
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
