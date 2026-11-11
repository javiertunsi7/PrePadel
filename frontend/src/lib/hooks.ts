import { useEffect, useState } from 'react';
import { msUntilReminder, notify } from './reminder';
import { useAppState } from './store';

/** La hora actual, refrescada cada cierto tiempo para que la pantalla no se quede vieja. */
export function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Vuelve arriba cuando cambia la pantalla o el paso (`key`), como al abrir una página nueva. */
export function useScrollToTop(key: unknown): void {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [key]);
}

/** Mantiene la pantalla encendida mientras se hace una rutina (modo manos libres). */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) {
      return;
    }
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = () => {
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          if (cancelled) {
            void sentinel.release();
          } else {
            lock = sentinel;
          }
        })
        .catch(() => {
          // el sistema puede negarlo (batería baja): la rutina sigue igual
        });
    };
    // El bloqueo se pierde al cambiar de app: se vuelve a pedir al regresar.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        acquire();
      }
    };

    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [active]);
}

/** Programa el aviso de calentamiento 30 minutos antes del partido. */
export function useMatchReminder(): void {
  const { matchAt } = useAppState();
  useEffect(() => {
    if (!matchAt) {
      return;
    }
    const delay = msUntilReminder(new Date(matchAt), new Date());
    if (delay === null) {
      return;
    }
    const id = window.setTimeout(() => {
      void notify('Toca calentar', 'Tu partido empieza en 30 minutos. Diez minutos de calentamiento y a la pista.');
    }, delay);
    return () => window.clearTimeout(id);
  }, [matchAt]);
}
