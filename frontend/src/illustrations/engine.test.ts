import { describe, expect, it } from 'vitest';
import {
  ANKLE_Y,
  BODY,
  FRAME,
  HIP_Y,
  buildModel,
  dir,
  mix,
  sampleLoop,
  solveFigure,
  type FigureIllustration,
  type FigurePose,
  type Vec,
} from './engine';

const distance = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** De pie y de lado, con los pies apoyados bajo la cadera. */
function standing(changes: Partial<FigurePose> = {}): FigurePose {
  return {
    pelvis: [60, HIP_Y],
    lean: 0,
    head: 0,
    turn: 0,
    armA: { a: [0, 0] },
    armB: { a: [0, 0] },
    legA: { to: [61.5, ANKLE_Y], bend: 1 },
    legB: { to: [58.5, ANKLE_Y], bend: 1 },
    footA: 90,
    footB: 90,
    ...changes,
  };
}

const squatting = standing({ pelvis: [51, 66.5], lean: 22 });

const squat: FigureIllustration = {
  kind: 'figure',
  view: 'side',
  frames: [{ pose: standing() }, { pose: squatting }],
  focus: ['kneeA'],
};

describe('geometría de la figura', () => {
  it('los ángulos se miden desde abajo: 90 es hacia delante y 180 hacia arriba', () => {
    expect(dir(0)[1]).toBeCloseTo(1);
    expect(dir(90)[0]).toBeCloseTo(1);
    expect(dir(180)[1]).toBeCloseTo(-1);
  });

  it('de pie, los pies tocan el suelo y la cabeza cabe en el lienzo', () => {
    const joints = solveFigure(standing(), 'side');

    expect(joints.ankleA[1]).toBeCloseTo(ANKLE_Y, 0);
    expect(joints.toeA[0]).toBeGreaterThan(joints.ankleA[0]); // la figura mira hacia la derecha
    expect(joints.headCenter[1] - BODY.headRadius).toBeGreaterThan(FRAME.top);
    expect(joints.chest[1]).toBeCloseTo(HIP_Y - BODY.torso);
  });

  it('al agacharse la rodilla dobla hacia delante sin que la pierna cambie de longitud', () => {
    const joints = solveFigure(squatting, 'side');

    expect(distance(joints.hipA, joints.kneeA)).toBeCloseTo(BODY.thigh, 3);
    expect(distance(joints.kneeA, joints.ankleA)).toBeCloseTo(BODY.shin, 3);
    expect(joints.kneeA[0]).toBeGreaterThan(joints.hipA[0]);
    expect(joints.ankleA[0]).toBeCloseTo(61.5);
    expect(joints.ankleA[1]).toBeCloseTo(ANKLE_Y);
  });

  it('si el punto queda fuera de alcance, el miembro se estira hacia él sin alargarse', () => {
    const joints = solveFigure(standing({ armA: { to: [200, 30], bend: -1 } }), 'side');

    expect(distance(joints.shoulderA, joints.handA)).toBeCloseTo(BODY.upperArm + BODY.forearm, 1);
  });

  it('de frente los hombros se separan y el giro del tronco los estrecha', () => {
    const facing = solveFigure(standing(), 'front');
    const turned = solveFigure(standing({ turn: 60 }), 'front');

    expect(facing.shoulderA[0] - facing.shoulderB[0]).toBeCloseTo(BODY.shoulderHalf * 2);
    expect(turned.shoulderA[0] - turned.shoulderB[0]).toBeCloseTo(BODY.shoulderHalf);
  });
});

describe('movimiento entre posturas', () => {
  it('mezcla números, puntos y miembros, y deja igual lo que no es numérico', () => {
    expect(mix(10, 20, 0.25)).toBe(12.5);
    expect(mix({ pelvis: [0, 10], bend: 1, view: 'side' }, { pelvis: [10, 30], bend: 1, view: 'front' }, 0.5)).toEqual({
      pelvis: [5, 20],
      bend: 1,
      view: 'side',
    });
  });

  it('el bucle empieza en la primera postura, llega a la última y no da saltos', () => {
    const { poses, seconds } = sampleLoop(squat);
    const heights = poses.map((pose) => pose.pelvis[1]);

    expect(seconds).toBeGreaterThan(1);
    expect(poses[0]).toEqual(standing());
    expect(Math.max(...heights)).toBeCloseTo(66.5, 1);
    heights.forEach((height, index) => {
      const next = heights[(index + 1) % heights.length];
      expect(Math.abs(next - height)).toBeLessThan(2);
    });
  });

  it('un ejercicio de aguantar, con una sola postura, no se mueve', () => {
    expect(sampleLoop({ frames: [{ pose: standing() }] })).toEqual({ poses: [standing()], seconds: 0 });
  });

  it('con más tiempo en la bajada, la figura pasa más fotogramas bajando que subiendo', () => {
    const { poses } = sampleLoop({
      frames: [
        { pose: 0, hold: 0, move: 1 },
        { pose: 10, hold: 0, move: 3 },
      ],
    });
    const top = poses.indexOf(Math.max(...poses));

    expect(top).toBeLessThan(poses.length / 2);
  });
});

describe('modelo que se pinta', () => {
  it('la imagen fija enseña la última postura y no lleva animaciones', () => {
    const model = buildModel(squat, false);

    expect(model.seconds).toBe(0);
    expect(model.shapes.every((shape) => shape.animations.length === 0)).toBe(true);
    expect(model.shapes.some((shape) => shape.cls === 'fig-focus')).toBe(true);
  });

  it('animada, solo se anima lo que se mueve y el bucle vuelve al punto de partida', () => {
    const model = buildModel(squat, true);
    const ground = model.shapes.find((shape) => shape.cls === 'fig-ground');
    const head = model.shapes.find((shape) => shape.cls === 'fig-head');

    expect(model.seconds).toBeGreaterThan(1);
    expect(ground?.animations).toEqual([]);
    expect(head?.animations.map((animation) => animation.attr)).toEqual(['cx', 'cy']);
    const values = head?.animations[0].values.split(';') ?? [];
    expect(values.at(-1)).toBe(values[0]);
  });
});
