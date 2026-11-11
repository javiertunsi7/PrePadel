import type { Routine, Step } from './types';

// Reproductor de rutinas como funciones puras: el componente solo pone el reloj,
// la voz y los botones. Así toda la lógica se prueba sin navegador.

export type Phase = 'ready' | 'work' | 'rest' | 'done';

export interface Playback {
  phase: Phase;
  /** Ejercicio en curso. Durante el descanso, el que se acaba de terminar. */
  stepIndex: number;
  remainingMs: number;
  paused: boolean;
}

/** Cuenta atrás antes del primer ejercicio, para dejar el móvil y colocarse. */
export const READY_SECONDS = 5;

export function start(): Playback {
  return { phase: 'ready', stepIndex: 0, remainingMs: READY_SECONDS * 1000, paused: false };
}

/** Avanza el reloj. Si pasa más tiempo del que queda, encadena las fases que toquen. */
export function advance(state: Playback, routine: Routine, elapsedMs: number): Playback {
  if (state.paused || state.phase === 'done') {
    return state;
  }
  let current = state;
  let left = elapsedMs;
  while (current.phase !== 'done' && left >= current.remainingMs) {
    left -= current.remainingMs;
    current = nextPhase(current, routine);
  }
  return current.phase === 'done' ? current : { ...current, remainingMs: current.remainingMs - left };
}

/** Salta al siguiente ejercicio (o termina si era el último). */
export function skip(state: Playback, routine: Routine): Playback {
  if (state.phase === 'done') {
    return state;
  }
  if (state.phase === 'ready') {
    return work(0, routine);
  }
  const next = state.stepIndex + 1;
  return next < routine.steps.length ? work(next, routine) : finished(state.stepIndex);
}

/** Repite el ejercicio en curso; si acaba de empezar, vuelve al anterior. */
export function back(state: Playback, routine: Routine): Playback {
  if (state.phase === 'done' || state.phase === 'ready') {
    return state;
  }
  const justStarted =
    state.phase === 'work' && routine.steps[state.stepIndex].durationSeconds * 1000 - state.remainingMs < 3000;
  return work(justStarted ? Math.max(0, state.stepIndex - 1) : state.stepIndex, routine);
}

export function togglePause(state: Playback): Playback {
  return state.phase === 'done' ? state : { ...state, paused: !state.paused };
}

/** Ejercicio que hay que enseñar: el que viene durante la cuenta atrás y el descanso, el actual si no. */
export function shownStep(state: Playback, routine: Routine): Step {
  const index = state.phase === 'rest' ? state.stepIndex + 1 : state.stepIndex;
  return routine.steps[Math.min(index, routine.steps.length - 1)];
}

/** Cuánto de la fase actual se ha completado, de 0 a 1. */
export function phaseProgress(state: Playback, routine: Routine): number {
  if (state.phase === 'done') {
    return 1;
  }
  const step = routine.steps[state.stepIndex];
  const totalSeconds =
    state.phase === 'ready' ? READY_SECONDS : state.phase === 'rest' ? step.restSeconds : step.durationSeconds;
  return totalSeconds > 0 ? 1 - state.remainingMs / (totalSeconds * 1000) : 1;
}

/** Lo que tiene que sonar al pasar de un estado al siguiente (modo manos libres). */
export type Cue = { kind: 'say'; text: string } | { kind: 'beep'; final: boolean };

export function cuesBetween(previous: Playback | null, next: Playback, routine: Routine): Cue[] {
  if (!previous || previous.phase !== next.phase || previous.stepIndex !== next.stepIndex) {
    const announcement: Cue = { kind: 'say', text: announce(next, routine) };
    return previous ? [{ kind: 'beep', final: true }, announcement] : [announcement];
  }
  if (next.paused || next.phase === 'done') {
    return [];
  }

  const cues: Cue[] = [];
  const step = routine.steps[next.stepIndex];
  if (next.phase === 'work' && step.switchSides) {
    const halfway = step.durationSeconds * 500;
    if (previous.remainingMs > halfway && next.remainingMs <= halfway) {
      cues.push({ kind: 'say', text: 'Cambia de lado.' });
    }
  }
  // Pitido al entrar en los tres últimos segundos de la fase.
  const secondsBefore = Math.ceil(previous.remainingMs / 1000);
  const secondsNow = Math.ceil(next.remainingMs / 1000);
  if (secondsNow !== secondsBefore && secondsNow >= 1 && secondsNow <= 3) {
    cues.push({ kind: 'beep', final: false });
  }
  return cues;
}

function announce(state: Playback, routine: Routine): string {
  const step = routine.steps[state.stepIndex];
  switch (state.phase) {
    case 'ready':
      return `${routine.name}. Prepárate. Empezamos con ${step.name}.`;
    case 'work':
      return step.voiceCue;
    case 'rest':
      return `Descansa. Siguiente: ${shownStep(state, routine).name}.`;
    case 'done':
      return 'Rutina completada. ¡Buen trabajo!';
  }
}

function nextPhase(state: Playback, routine: Routine): Playback {
  if (state.phase === 'ready') {
    return work(0, routine);
  }
  const isLast = state.stepIndex >= routine.steps.length - 1;
  if (state.phase === 'work') {
    if (isLast) {
      return finished(state.stepIndex);
    }
    const restSeconds = routine.steps[state.stepIndex].restSeconds;
    return restSeconds > 0
      ? { phase: 'rest', stepIndex: state.stepIndex, remainingMs: restSeconds * 1000, paused: false }
      : work(state.stepIndex + 1, routine);
  }
  return isLast ? finished(state.stepIndex) : work(state.stepIndex + 1, routine);
}

function work(stepIndex: number, routine: Routine): Playback {
  return { phase: 'work', stepIndex, remainingMs: routine.steps[stepIndex].durationSeconds * 1000, paused: false };
}

function finished(stepIndex: number): Playback {
  return { phase: 'done', stepIndex, remainingMs: 0, paused: false };
}
