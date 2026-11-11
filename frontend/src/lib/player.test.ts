import { describe, expect, it } from 'vitest';
import { warmup as routine } from '../test/fixtures';
import {
  advance,
  back,
  cuesBetween,
  phaseProgress,
  READY_SECONDS,
  shownStep,
  skip,
  start,
  togglePause,
  type Playback,
} from './player';

// La rutina de prueba: Marcha activa (30 s + 10 s de descanso) y
// Estiramiento de gemelos (20 s, cambiando de lado a mitad).

const READY_MS = READY_SECONDS * 1000;

function firstExercise(): Playback {
  return advance(start(), routine, READY_MS);
}

describe('reloj de la rutina', () => {
  it('empieza con una cuenta atrás y luego arranca el primer ejercicio', () => {
    expect(start()).toEqual({ phase: 'ready', stepIndex: 0, remainingMs: READY_MS, paused: false });
    expect(firstExercise()).toEqual({ phase: 'work', stepIndex: 0, remainingMs: 30_000, paused: false });
  });

  it('descuenta el tiempo transcurrido dentro de un ejercicio', () => {
    expect(advance(firstExercise(), routine, 12_300).remainingMs).toBe(17_700);
  });

  it('descansa entre ejercicios, pasa al siguiente y termina tras el último', () => {
    const resting = advance(firstExercise(), routine, 30_000);
    expect(resting).toMatchObject({ phase: 'rest', stepIndex: 0, remainingMs: 10_000 });

    const second = advance(resting, routine, 10_000);
    expect(second).toMatchObject({ phase: 'work', stepIndex: 1, remainingMs: 20_000 });

    expect(advance(second, routine, 20_000)).toMatchObject({ phase: 'done', remainingMs: 0 });
  });

  it('encadena varias fases si pasa mucho tiempo de golpe', () => {
    const state = advance(start(), routine, READY_MS + 30_000 + 10_000 + 5_000);
    expect(state).toMatchObject({ phase: 'work', stepIndex: 1, remainingMs: 15_000 });
  });

  it('en pausa el tiempo no corre', () => {
    const paused = togglePause(firstExercise());
    expect(advance(paused, routine, 60_000)).toBe(paused);
    expect(advance(togglePause(paused), routine, 1_000).remainingMs).toBe(29_000);
  });

  it('una rutina terminada ya no cambia', () => {
    const done = advance(start(), routine, 10 * 60_000);
    expect(done.phase).toBe('done');
    expect(advance(done, routine, 5_000)).toBe(done);
    expect(togglePause(done)).toBe(done);
  });
});

describe('botones del reproductor', () => {
  it('saltar lleva al siguiente ejercicio sin pasar por el descanso', () => {
    expect(skip(start(), routine)).toMatchObject({ phase: 'work', stepIndex: 0 });
    expect(skip(firstExercise(), routine)).toMatchObject({ phase: 'work', stepIndex: 1, remainingMs: 20_000 });
  });

  it('saltar el último ejercicio termina la rutina', () => {
    const last = skip(firstExercise(), routine);
    expect(skip(last, routine).phase).toBe('done');
  });

  it('atrás repite el ejercicio en curso desde el principio', () => {
    const second = advance(skip(firstExercise(), routine), routine, 8_000);
    expect(back(second, routine)).toMatchObject({ phase: 'work', stepIndex: 1, remainingMs: 20_000 });
  });

  it('atrás, con el ejercicio recién empezado, vuelve al anterior', () => {
    const second = advance(skip(firstExercise(), routine), routine, 1_000);
    expect(back(second, routine)).toMatchObject({ phase: 'work', stepIndex: 0, remainingMs: 30_000 });
  });

  it('atrás durante el descanso repite el ejercicio que se acaba de hacer', () => {
    const resting = advance(firstExercise(), routine, 30_000);
    expect(back(resting, routine)).toMatchObject({ phase: 'work', stepIndex: 0, remainingMs: 30_000 });
  });
});

describe('lo que se enseña en pantalla', () => {
  it('durante la cuenta atrás y el descanso se ve el ejercicio que viene', () => {
    expect(shownStep(start(), routine).name).toBe('Marcha activa');
    expect(shownStep(firstExercise(), routine).name).toBe('Marcha activa');
    expect(shownStep(advance(firstExercise(), routine, 30_000), routine).name).toBe('Estiramiento de gemelos');
  });

  it('el anillo se llena según avanza la fase', () => {
    expect(phaseProgress(firstExercise(), routine)).toBe(0);
    expect(phaseProgress(advance(firstExercise(), routine, 15_000), routine)).toBe(0.5);
    expect(phaseProgress(advance(start(), routine, 10 * 60_000), routine)).toBe(1);
  });
});

describe('voz y pitidos del modo manos libres', () => {
  it('al empezar anuncia la rutina y el primer ejercicio', () => {
    expect(cuesBetween(null, start(), routine)).toEqual([
      { kind: 'say', text: 'Calentamiento prepartido. Prepárate. Empezamos con Marcha activa.' },
    ]);
  });

  it('al arrancar un ejercicio pita y lee su indicación', () => {
    const before = advance(start(), routine, READY_MS - 100);
    expect(cuesBetween(before, advance(before, routine, 200), routine)).toEqual([
      { kind: 'beep', final: true },
      { kind: 'say', text: 'Vamos con Marcha activa.' },
    ]);
  });

  it('en el descanso dice cuál es el siguiente ejercicio', () => {
    const before = advance(firstExercise(), routine, 29_900);
    expect(cuesBetween(before, advance(before, routine, 200), routine)).toContainEqual({
      kind: 'say',
      text: 'Descansa. Siguiente: Estiramiento de gemelos.',
    });
  });

  it('felicita al terminar', () => {
    const before = advance(skip(firstExercise(), routine), routine, 19_900);
    expect(cuesBetween(before, advance(before, routine, 200), routine)).toContainEqual({
      kind: 'say',
      text: 'Rutina completada. ¡Buen trabajo!',
    });
  });

  it('pita una vez al entrar en cada uno de los tres últimos segundos', () => {
    const at = (elapsedMs: number) => advance(firstExercise(), routine, elapsedMs);
    const beep = { kind: 'beep', final: false };

    expect(cuesBetween(at(26_800), at(26_950), routine)).toEqual([]);
    expect(cuesBetween(at(26_950), at(27_050), routine)).toEqual([beep]);
    expect(cuesBetween(at(27_050), at(27_250), routine)).toEqual([]);
    expect(cuesBetween(at(27_950), at(28_050), routine)).toEqual([beep]);
    expect(cuesBetween(at(28_950), at(29_050), routine)).toEqual([beep]);
  });

  it('avisa de cambiar de lado a mitad del ejercicio, solo si el ejercicio lo pide', () => {
    const second = skip(firstExercise(), routine);
    const halfway = cuesBetween(advance(second, routine, 9_900), advance(second, routine, 10_100), routine);
    expect(halfway).toEqual([{ kind: 'say', text: 'Cambia de lado.' }]);

    const first = firstExercise();
    expect(cuesBetween(advance(first, routine, 14_900), advance(first, routine, 15_100), routine)).toEqual([]);
  });

  it('en pausa no suena nada', () => {
    const paused = togglePause(advance(firstExercise(), routine, 28_500));
    expect(cuesBetween(paused, paused, routine)).toEqual([]);
  });
});
