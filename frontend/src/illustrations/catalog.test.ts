import { describe, expect, it } from 'vitest';
// El catálogo de ejercicios de verdad: la migración con la que arranca el backend.
import seed from '../../../backend/src/main/resources/db/migration/V2__seed_content.sql?raw';
import { ILLUSTRATIONS } from './catalog';
import {
  FRAME,
  buildModel,
  drawFrame,
  sampleLoop,
  type FigurePose,
  type ForearmPose,
  type Illustration,
} from './engine';

/** Ejercicios que aparecen en alguna rutina: filas `('rutina', orden, 'ejercicio', ...)`. */
const exercisesInRoutines = new Set(
  [...seed.matchAll(/^\('[a-z0-9-]+',\s*\d+,\s*'([a-z0-9-]+)'/gm)].map((match) => match[1]),
);

/** Forma de una postura sin sus valores: qué campos tiene y cómo se coloca cada miembro. */
function structure(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(structure);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, inner]) => [key, structure(inner)]),
    );
  }
  return typeof value;
}

function coordinates(illustration: Illustration): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const pose of sampleLoop<FigurePose | ForearmPose>(illustration).poses) {
    for (const shape of drawFrame(illustration, pose)) {
      if (shape.kind === 'circle') {
        xs.push(shape.cx - shape.r, shape.cx + shape.r);
        ys.push(shape.cy - shape.r, shape.cy + shape.r);
      } else if (shape.kind === 'path' && shape.cls !== 'fig-arrow') {
        const numbers = (shape.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
        numbers.forEach((number, index) => (index % 2 === 0 ? xs : ys).push(number));
      }
    }
  }
  return { xs, ys };
}

describe('catálogo de ilustraciones', () => {
  it('lee los ejercicios del backend', () => {
    expect(exercisesInRoutines.size).toBe(38);
  });

  it('cada ejercicio de las rutinas tiene su ilustración', () => {
    const missing = [...exercisesInRoutines].filter((slug) => !(slug in ILLUSTRATIONS));

    expect(missing).toEqual([]);
  });

  it('no quedan ilustraciones de ejercicios que ya no existen', () => {
    const orphans = Object.keys(ILLUSTRATIONS).filter((slug) => !exercisesInRoutines.has(slug));

    expect(orphans).toEqual([]);
  });

  it.each(Object.entries(ILLUSTRATIONS))('%s: todas sus posturas tienen la misma forma', (_slug, illustration) => {
    const [first, ...rest] = illustration.frames.map((frame) => structure(frame.pose));

    rest.forEach((other) => expect(other).toEqual(first));
  });

  it.each(Object.entries(ILLUSTRATIONS))('%s: el dibujo cabe en el lienzo durante todo el movimiento', (_slug, illustration) => {
    const { xs, ys } = coordinates(illustration);

    expect(xs.every(Number.isFinite) && ys.every(Number.isFinite)).toBe(true);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(FRAME.left - 1);
    expect(Math.max(...xs)).toBeLessThanOrEqual(FRAME.left + FRAME.width + 1);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(FRAME.top - 1);
    expect(Math.max(...ys)).toBeLessThanOrEqual(FRAME.top + FRAME.height + 1);
  });

  it.each(Object.entries(ILLUSTRATIONS))('%s: se puede pintar fija y animada', (_slug, illustration) => {
    expect(buildModel(illustration, false).shapes.length).toBeGreaterThan(3);
    expect(buildModel(illustration, true).shapes.length).toBeGreaterThan(3);
  });

  it.each(Object.entries(ILLUSTRATIONS))('%s: el movimiento es continuo, sin saltos', (_slug, illustration) => {
    // Entre un fotograma y el siguiente (también al cerrar el bucle) nada se teletransporta:
    // un codo o una rodilla que cambiara de lado de golpe daría un salto mucho mayor.
    let biggestJump = 0;
    for (const shape of buildModel(illustration, true).shapes) {
      for (const animation of shape.animations) {
        const frames = animation.values.split(';').map((value) => (value.match(/-?\d+(\.\d+)?/g) ?? []).map(Number));
        for (let index = 1; index < frames.length; index++) {
          frames[index].forEach((number, position) => {
            biggestJump = Math.max(biggestJump, Math.abs(number - frames[index - 1][position]));
          });
        }
      }
    }

    expect(biggestJump).toBeLessThan(15);
  });
});
