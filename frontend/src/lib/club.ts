import { load, remove, save } from './storage';

// Enlace de club (https://…/?club=código): el club que reparte la app entre sus jugadores.
// El código se guarda en el móvil hasta crear el plan y viaja con el cuestionario. El servidor
// solo se queda con los clubes que conoce (prepadel.clubs) y el panel cuenta la retención por club.

const KEY = 'prepadel.club';

/** Lo mismo que acepta el servidor: minúsculas, cifras y guiones. */
const CODE = /^[a-z0-9-]{2,40}$/;

/**
 * Al abrir la app: si la dirección trae ?club=, lo guarda (solo si aún no hay plan) y lo quita
 * de la barra para que no se quede en marcadores ni en la app instalada.
 */
export function captureClubLink(registered: boolean): void {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('club');
  if (code === null) {
    return;
  }
  const normalized = code.trim().toLowerCase();
  if (!registered && CODE.test(normalized)) {
    save(KEY, normalized);
  }
  url.searchParams.delete('club');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}

/** El club con cuyo enlace se abrió la app, mientras no se haya creado el plan. */
export function pendingClub(): string | null {
  const code = load<unknown>(KEY);
  return typeof code === 'string' && CODE.test(code) ? code : null;
}

/** Ya llegó al servidor con el alta: no hace falta guardarlo más. */
export function forgetClub(): void {
  remove(KEY);
}
