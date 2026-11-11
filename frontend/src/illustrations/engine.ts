// Motor de ilustraciones: cada ejercicio se describe con unas pocas posturas
// clave de una figura articulada y aquí se calcula todo lo demás (dónde cae
// cada articulación, cómo se pasa de una postura a otra y qué hay que pintar).
// No hay imágenes: son números, así que pesan poco y funcionan sin cobertura.

export type Vec = readonly [number, number];

/** Lienzo de todas las ilustraciones. El suelo está en y = ground. */
export const FRAME = { left: 0, top: -6, width: 120, height: 118, ground: 104 } as const;

/** Proporciones de la figura. De pie mide unas 90 unidades. */
export const BODY = {
  headRadius: 7,
  neck: 4,
  torso: 27,
  shoulderHalf: 10.5,
  hipHalf: 5.5,
  upperArm: 15.5,
  forearm: 14.5,
  hand: 5.5,
  thigh: 21,
  shin: 21,
  foot: 8,
  ankle: 2.5,
} as const;

/** Altura del tobillo con el pie apoyado, y de la cadera estando de pie. */
export const ANKLE_Y = FRAME.ground - BODY.ankle;
export const HIP_Y = ANKLE_Y - BODY.thigh - BODY.shin;

/** De lado, el brazo y la pierna de cada lado se separan un poco para que no se tapen. */
const SIDE_OFFSET = 1.6;
/** Medio ancho del tronco visto de lado. */
const TORSO_HALF = 4.6;

/**
 * Vector unitario para un ángulo medido desde "hacia abajo":
 * 0 = abajo, 90 = hacia +x (delante en la vista lateral), 180 = arriba, -90 = hacia -x.
 */
export function dir(degrees: number): Vec {
  const radians = (degrees * Math.PI) / 180;
  return [Math.sin(radians), Math.cos(radians)];
}

function move(from: Vec, direction: Vec, distance: number): Vec {
  return [from[0] + direction[0] * distance, from[1] + direction[1] * distance];
}

function between(a: Vec, b: Vec, t = 0.5): Vec {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/**
 * Cómo se coloca un brazo o una pierna:
 * - `a`: ángulos de sus dos segmentos (giran sin cambiar de longitud);
 * - `to` + `bend`: la mano o el pie llega a un punto y el codo o la rodilla se
 *   calcula solo. `bend` 1 dobla hacia +x cuando el miembro apunta hacia abajo;
 * - `via` + `to`: puntos puestos a mano, para escorzos (un antebrazo que viene hacia quien mira).
 */
export type Limb =
  | { a: readonly [number, number] }
  | { to: Vec; bend: number }
  | { via: Vec; to: Vec };

export interface FigurePose {
  pelvis: Vec;
  /** Inclinación del tronco en grados: 0 vertical, positivo hacia +x. */
  lean: number;
  /** Giro de la cabeza respecto al tronco. */
  head: number;
  /** Giro del tronco sobre su eje: de frente estrecha los hombros, de lado adelanta el hombro B. */
  turn: number;
  armA: Limb;
  armB: Limb;
  legA: Limb;
  legB: Limb;
  footA: number;
  footB: number;
  /** Si se indica, la mano se dibuja como un segmento con ese ángulo (para estiramientos de muñeca). */
  handA?: number;
  handB?: number;
  /** Ángulo de la pala que lleva la mano A. */
  racket?: number;
}

/** De lado la figura mira hacia +x (A es el lado cercano); de frente, A es la derecha de la imagen. */
export type View = 'side' | 'front';

export interface Joints {
  pelvis: Vec;
  chest: Vec;
  /** Dirección unitaria de la línea de hombros. */
  across: Vec;
  headCenter: Vec;
  headUp: Vec;
  shoulderA: Vec;
  shoulderB: Vec;
  elbowA: Vec;
  elbowB: Vec;
  handA: Vec;
  handB: Vec;
  hipA: Vec;
  hipB: Vec;
  kneeA: Vec;
  kneeB: Vec;
  ankleA: Vec;
  ankleB: Vec;
  toeA: Vec;
  toeB: Vec;
}

function solveLimb(root: Vec, limb: Limb, first: number, second: number): { mid: Vec; end: Vec } {
  if ('a' in limb) {
    const mid = move(root, dir(limb.a[0]), first);
    return { mid, end: move(mid, dir(limb.a[1]), second) };
  }
  if ('via' in limb) {
    return { mid: limb.via, end: limb.to };
  }
  const dx = limb.to[0] - root[0];
  const dy = limb.to[1] - root[1];
  const distance = Math.hypot(dx, dy);
  // Si el punto queda fuera de alcance, el miembro se estira del todo hacia él.
  const reach = Math.min(Math.max(distance, Math.abs(first - second) + 0.01), first + second - 0.01);
  const towards: Vec = distance < 1e-6 ? [0, 1] : [dx / distance, dy / distance];
  const along = (first * first - second * second + reach * reach) / (2 * reach);
  const sideways = Math.sqrt(Math.max(0, first * first - along * along)) * limb.bend;
  return {
    mid: [root[0] + towards[0] * along + towards[1] * sideways, root[1] + towards[1] * along - towards[0] * sideways],
    end: move(root, towards, reach),
  };
}

export function solveFigure(pose: FigurePose, view: View): Joints {
  const lean = (pose.lean * Math.PI) / 180;
  const turn = (pose.turn * Math.PI) / 180;
  const up = dir(180 - pose.lean);
  const across: Vec = [Math.cos(lean), Math.sin(lean)];
  const chest = move(pose.pelvis, up, BODY.torso);
  const headUp = dir(180 - pose.lean - pose.head);

  const shoulderOffset =
    view === 'front' ? BODY.shoulderHalf * Math.cos(turn) : SIDE_OFFSET - BODY.shoulderHalf * Math.sin(turn);
  const hipOffset = view === 'front' ? BODY.hipHalf : SIDE_OFFSET;
  const shoulderA = move(chest, across, shoulderOffset);
  const shoulderB = move(chest, across, -shoulderOffset);
  const hipA = move(pose.pelvis, across, hipOffset);
  const hipB = move(pose.pelvis, across, -hipOffset);

  const armA = solveLimb(shoulderA, pose.armA, BODY.upperArm, BODY.forearm);
  const armB = solveLimb(shoulderB, pose.armB, BODY.upperArm, BODY.forearm);
  const legA = solveLimb(hipA, pose.legA, BODY.thigh, BODY.shin);
  const legB = solveLimb(hipB, pose.legB, BODY.thigh, BODY.shin);
  const foot = view === 'front' ? 5 : BODY.foot;

  return {
    pelvis: pose.pelvis,
    chest,
    across,
    headCenter: move(chest, headUp, BODY.neck + BODY.headRadius),
    headUp,
    shoulderA,
    shoulderB,
    elbowA: armA.mid,
    elbowB: armB.mid,
    handA: armA.end,
    handB: armB.end,
    hipA,
    hipB,
    kneeA: legA.mid,
    kneeB: legB.mid,
    ankleA: legA.end,
    ankleB: legB.end,
    toeA: move(legA.end, dir(pose.footA), foot),
    toeB: move(legB.end, dir(pose.footB), foot),
  };
}

/** Punto del cuerpo que se resalta con el color de la zona. */
export type FocusPoint =
  | 'pelvis'
  | 'shoulderA'
  | 'shoulderB'
  | 'elbowA'
  | 'elbowB'
  | 'handA'
  | 'handB'
  | 'kneeA'
  | 'kneeB'
  | 'ankleA'
  | 'ankleB'
  | 'forearmA'
  | 'forearmB'
  | 'thighA'
  | 'thighB'
  | 'calfA'
  | 'calfB';

function focusPosition(joints: Joints, point: FocusPoint): Vec {
  switch (point) {
    case 'forearmA':
      return between(joints.elbowA, joints.handA);
    case 'forearmB':
      return between(joints.elbowB, joints.handB);
    case 'thighA':
      return between(joints.hipA, joints.kneeA);
    case 'thighB':
      return between(joints.hipB, joints.kneeB);
    case 'calfA':
      return between(joints.kneeA, joints.ankleA);
    case 'calfB':
      return between(joints.kneeB, joints.ankleB);
    default:
      return joints[point];
  }
}

/** Objetos de la escena. Los que dependen de la figura se mueven con ella. */
export type Prop =
  | { type: 'wall'; x: number; width: number }
  | { type: 'backwall' }
  | { type: 'chair'; x: number }
  | { type: 'step'; x: number; width: number; height: number }
  | { type: 'post'; x: number; top: number }
  | { type: 'mat'; from: number; to: number }
  | { type: 'elastic'; from: Vec; to: 'handA' | 'handB' }
  | { type: 'kneeBand' }
  | { type: 'bar' };

export type Loop = 'pingpong' | 'cycle';

/** Postura clave. `hold` y `move` se miden en tiempos: cuánto se aguanta y cuánto tarda en pasar a la siguiente. */
export interface Keyframe<P> {
  pose: P;
  hold?: number;
  move?: number;
}

interface IllustrationBase<P> {
  frames: Keyframe<P>[];
  /** `pingpong` va y vuelve por las mismas posturas; `cycle` las recorre en círculo. */
  loop?: Loop;
  /** Segundos que dura un tiempo. */
  beat?: number;
  /** Postura que se enseña cuando la imagen es fija; por defecto, la última. */
  still?: number;
  /** Flechas de movimiento (trazados SVG). */
  arrows?: string[];
  /** Texto corto dentro del dibujo. */
  note?: string;
}

export interface FigureIllustration extends IllustrationBase<FigurePose> {
  kind: 'figure';
  view: View;
  props?: Prop[];
  focus?: FocusPoint[];
}

/** Primer plano de un antebrazo apoyado, para los ejercicios de muñeca. */
export interface ForearmPose {
  /** Grados que sube (positivo) o baja la mano respecto al antebrazo. */
  wrist: number;
  /** De 0 (mano abierta) a 1 (apretando). */
  squeeze: number;
  /** De 0 a 1: cuánto se ve la otra mano ayudando o empujando. */
  helper: number;
}

export interface ForearmIllustration extends IllustrationBase<ForearmPose> {
  kind: 'forearm';
  object?: 'bottle' | 'ball';
}

export type Illustration = FigureIllustration | ForearmIllustration;

/** Lo que se pinta. Las clases CSS (`fig-…`) dan color y grosor. */
export type Shape =
  | { kind: 'path'; cls: string; d: string; opacity?: number }
  | { kind: 'circle'; cls: string; cx: number; cy: number; r: number }
  | { kind: 'text'; cls: string; x: number; y: number; text: string };

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function trace(cls: string, points: readonly Vec[], closed = false, opacity?: number): Shape {
  const d = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point[0])} ${round(point[1])}`).join(' ');
  return { kind: 'path', cls, d: closed ? `${d} Z` : d, ...(opacity === undefined ? {} : { opacity: round(opacity) }) };
}

function dot(cls: string, center: Vec, r: number): Shape {
  return { kind: 'circle', cls, cx: round(center[0]), cy: round(center[1]), r: round(r) };
}

function oval(center: Vec, axis: Vec, long: number, short: number): Vec[] {
  const steps = 14;
  return Array.from({ length: steps }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2;
    return [
      center[0] + axis[0] * Math.cos(angle) * long - axis[1] * Math.sin(angle) * short,
      center[1] + axis[1] * Math.cos(angle) * long + axis[0] * Math.sin(angle) * short,
    ] as const;
  });
}

function box(left: number, top: number, right: number, bottom: number): Vec[] {
  return [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ];
}

const GROUND_LINE: Shape = trace('fig-ground', [
  [5, FRAME.ground + 1.5],
  [115, FRAME.ground + 1.5],
]);

function scenery(props: readonly Prop[]): Shape[] {
  const shapes: Shape[] = [];
  for (const prop of props) {
    switch (prop.type) {
      case 'wall':
        shapes.push(trace('fig-wall', box(prop.x, FRAME.top, prop.x + prop.width, FRAME.ground + 1.5), true));
        break;
      case 'backwall':
        shapes.push(trace('fig-wall', box(12, FRAME.top + 3, 108, FRAME.ground + 1.5), true));
        break;
      case 'chair':
        shapes.push(
          trace('fig-furniture', [
            [prop.x + 1, 50],
            [prop.x + 1, FRAME.ground],
          ]),
          trace('fig-furniture', [
            [prop.x + 21, 81],
            [prop.x + 21, FRAME.ground],
          ]),
          trace('fig-furniture fig-furniture--seat', [
            [prop.x, 81],
            [prop.x + 23, 81],
          ]),
        );
        break;
      case 'step':
        shapes.push(
          trace('fig-box', box(prop.x, FRAME.ground - prop.height, prop.x + prop.width, FRAME.ground + 1), true),
        );
        break;
      case 'post':
        shapes.push(
          trace('fig-furniture', [
            [prop.x, prop.top],
            [prop.x, FRAME.ground],
          ]),
        );
        break;
      case 'mat':
        shapes.push(
          trace('fig-mat', [
            [prop.from, FRAME.ground + 1],
            [prop.to, FRAME.ground + 1],
          ]),
        );
        break;
      default:
        break; // los demás objetos se mueven con la figura
    }
  }
  return shapes;
}

function drawFigure(illustration: FigureIllustration, pose: FigurePose): Shape[] {
  const joints = solveFigure(pose, illustration.view);
  const props = illustration.props ?? [];
  const side = illustration.view === 'side';
  const farSide = side ? 'fig-far' : 'fig-near';

  // Un brazo que pasa por delante del cuerpo lleva un borde claro para que no se funda con él.
  const arm = (
    tone: string,
    shoulder: Vec,
    elbow: Vec,
    hand: Vec,
    handAngle: number | undefined,
    inFront: boolean,
  ): Shape[] => [
    ...(inFront ? [trace('fig-halo', [shoulder, elbow, hand])] : []),
    trace(`fig-arm ${tone}`, [shoulder, elbow, hand]),
    handAngle === undefined
      ? dot(`fig-fist ${tone}`, hand, 2.8)
      : trace(`fig-hand ${tone}`, [hand, move(hand, dir(handAngle), BODY.hand)]),
  ];
  const armA = arm('fig-near', joints.shoulderA, joints.elbowA, joints.handA, pose.handA, true);
  const armB = arm(farSide, joints.shoulderB, joints.elbowB, joints.handB, pose.handB, !side);
  const legA = trace('fig-leg fig-near', [joints.hipA, joints.kneeA, joints.ankleA, joints.toeA]);
  const legB = trace(`fig-leg ${farSide}`, [joints.hipB, joints.kneeB, joints.ankleB, joints.toeB]);

  // La camiseta: de lado es una cápsula; de frente va de hombro a hombro y de cadera a cadera.
  const shoulderHalf = side
    ? TORSO_HALF
    : Math.max(TORSO_HALF, Math.hypot(joints.shoulderA[0] - joints.chest[0], joints.shoulderA[1] - joints.chest[1]));
  const hipHalf = side ? TORSO_HALF : BODY.hipHalf + 0.8;
  const headSide: Vec = [-joints.headUp[1], joints.headUp[0]];
  const bandCenter = move(joints.headCenter, joints.headUp, BODY.headRadius * 0.36);
  const body: Shape[] = [
    trace('fig-neck', [joints.chest, joints.headCenter]),
    trace(
      'fig-torso',
      [
        move(joints.chest, joints.across, shoulderHalf),
        move(joints.chest, joints.across, -shoulderHalf),
        move(joints.pelvis, joints.across, -hipHalf),
        move(joints.pelvis, joints.across, hipHalf),
      ],
      true,
    ),
    dot('fig-head', joints.headCenter, BODY.headRadius),
    trace('fig-headband', [
      move(bandCenter, headSide, -BODY.headRadius * 0.9),
      move(bandCenter, headSide, BODY.headRadius * 0.9),
    ]),
  ];

  const shapes: Shape[] = [...scenery(props), GROUND_LINE];
  if (side) {
    shapes.push(legB, ...armB, legA, ...body, ...armA);
  } else {
    shapes.push(legB, legA, ...body, ...armB, ...armA);
  }

  for (const prop of props) {
    if (prop.type === 'elastic') {
      shapes.push(trace('fig-elastic', [prop.from, joints[prop.to]]));
    } else if (prop.type === 'kneeBand') {
      shapes.push(
        trace('fig-elastic', [between(joints.kneeA, joints.hipA, 0.22), between(joints.kneeB, joints.hipB, 0.22)]),
      );
    } else if (prop.type === 'bar') {
      const length = Math.hypot(joints.handA[0] - joints.handB[0], joints.handA[1] - joints.handB[1]) || 1;
      const axis: Vec = [(joints.handA[0] - joints.handB[0]) / length, (joints.handA[1] - joints.handB[1]) / length];
      shapes.push(
        trace('fig-handle', [move(joints.handB, axis, -3), joints.handA]),
        trace('fig-racket', oval(move(joints.handA, axis, 8), axis, 7.5, 5.5), true),
      );
    }
  }

  if (pose.racket !== undefined) {
    const axis = dir(pose.racket);
    shapes.push(
      trace('fig-handle', [joints.handA, move(joints.handA, axis, 8)]),
      trace('fig-racket', oval(move(joints.handA, axis, 15.5), axis, 8.5, 6.5), true),
    );
  }

  for (const point of illustration.focus ?? []) {
    shapes.push(dot('fig-focus', focusPosition(joints, point), 4.2));
  }
  return shapes;
}

function drawForearm(illustration: ForearmIllustration, pose: ForearmPose): Shape[] {
  const elbow: Vec = [22, 62];
  const wrist: Vec = [70, 62];
  const angle = (pose.wrist * Math.PI) / 180;
  const along: Vec = [Math.cos(angle), -Math.sin(angle)];
  const below: Vec = [Math.sin(angle), Math.cos(angle)];
  const grip = move(wrist, along, 10);

  const shapes: Shape[] = [
    // el muslo o la mesa donde descansa el antebrazo
    trace('fig-support', [
      [0, 81],
      [62, 81],
    ]),
    trace('fig-limb fig-far', [[8, 26], elbow]),
    trace('fig-limb fig-near', [elbow, wrist]),
  ];

  if (illustration.object === 'bottle') {
    const top = move(grip, below, -14);
    const bottom = move(grip, below, 13);
    shapes.push(
      trace('fig-bottle-edge', [top, bottom]),
      trace('fig-bottle', [top, bottom]),
      trace('fig-bottle-cap', [move(grip, below, -17.5), move(grip, below, -20)]),
    );
  }

  // La mano va en claro con borde, para que se distinga del antebrazo.
  const knuckles = move(wrist, along, 15.5);
  shapes.push(
    trace('fig-mitt-edge', [move(wrist, along, 3), knuckles]),
    trace('fig-mitt', [move(wrist, along, 3), knuckles]),
  );

  if (illustration.object === 'ball') {
    const radius = 8.4 - pose.squeeze * 1.8;
    const ball = move(move(wrist, along, 13), below, -(radius + 5));
    const over = move(move(ball, below, -(radius + 1.5)), along, 6 - pose.squeeze * 10);
    const corner = move(move(knuckles, below, -(13 - pose.squeeze * 2)), along, 5 - pose.squeeze * 3);
    shapes.push(dot('fig-ball', ball, radius), {
      kind: 'path',
      cls: 'fig-fingers',
      d: `M${round(knuckles[0])} ${round(knuckles[1])} Q${round(corner[0])} ${round(corner[1])} ${round(over[0])} ${round(over[1])}`,
    });
  }

  // La otra mano, que empuja o ayuda desde arriba: llega en diagonal y se apoya encima.
  const palmFrom = move(move(grip, below, -11), along, -6);
  const palmTo = move(palmFrom, along, 11);
  shapes.push(
    trace('fig-limb fig-far', [move(palmTo, [0.5, -0.87], 34), move(palmTo, [0.5, -0.87], 5)], false, pose.helper),
    trace('fig-mitt-edge', [palmFrom, palmTo], false, pose.helper),
    trace('fig-mitt', [palmFrom, palmTo], false, pose.helper),
    dot('fig-focus', [46, 62], 4.6),
  );
  return shapes;
}

/** Todo lo que hay que pintar para una postura de una ilustración. */
export function drawFrame(illustration: Illustration, pose: FigurePose | ForearmPose): Shape[] {
  const shapes =
    illustration.kind === 'figure'
      ? drawFigure(illustration, pose as FigurePose)
      : drawForearm(illustration, pose as ForearmPose);
  for (const arrow of illustration.arrows ?? []) {
    shapes.push({ kind: 'path', cls: 'fig-arrow', d: arrow });
  }
  if (illustration.note) {
    shapes.push({ kind: 'text', cls: 'fig-note', x: 4, y: 3, text: illustration.note });
  }
  return shapes;
}

/** Mezcla dos posturas con la misma forma: los números se interpolan, lo demás se queda igual. */
export function mix<T>(from: T, to: T, t: number): T {
  if (typeof from === 'number' && typeof to === 'number') {
    return (from + (to - from) * t) as T;
  }
  if (Array.isArray(from) && Array.isArray(to)) {
    return from.map((item: unknown, index) => mix(item, to[index] as unknown, t)) as T;
  }
  if (from !== null && typeof from === 'object' && to !== null && typeof to === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(from)) {
      result[key] = mix((from as Record<string, unknown>)[key], (to as Record<string, unknown>)[key], t);
    }
    return result as T;
  }
  return from;
}

const DEFAULT_BEAT = 0.9;
const DEFAULT_HOLD = 0.25;
const SAMPLES_PER_SECOND = 12;
/** Un movimiento rápido se muestrea más fino, hasta este límite, para que no vaya a trompicones. */
const MAX_SAMPLES_PER_SECOND = 48;
/** Lo máximo que debería moverse un punto entre dos fotogramas seguidos. */
const SMOOTH_STEP = 7;

/**
 * Convierte las posturas clave en una secuencia de posturas a intervalos
 * iguales que, repetida, da el movimiento completo. Los giros se muestrean
 * para que brazos y piernas no se encojan a mitad de camino.
 */
export function sampleLoop<P>(
  illustration: IllustrationBase<P>,
  perSecond = SAMPLES_PER_SECOND,
): { poses: P[]; seconds: number } {
  const { frames } = illustration;
  if (frames.length < 2) {
    return { poses: [frames[0].pose], seconds: 0 };
  }
  const forward = frames.map((_, index) => index);
  const order =
    illustration.loop === 'cycle' ? [...forward, 0] : [...forward, ...forward.slice(1, -1).reverse(), 0];

  const stages: { from: number; to: number; hold: number; move: number }[] = [];
  for (let index = 0; index < order.length - 1; index++) {
    const frame = frames[order[index]];
    stages.push({
      from: order[index],
      to: order[index + 1],
      hold: frame.hold ?? DEFAULT_HOLD,
      move: frame.move ?? 1,
    });
  }
  const beats = stages.reduce((total, stage) => total + stage.hold + stage.move, 0);
  const seconds = beats * (illustration.beat ?? DEFAULT_BEAT);
  const count = Math.max(8, Math.round(seconds * perSecond));

  const poseAt = (beat: number): P => {
    let start = 0;
    for (const stage of stages) {
      const moving = start + stage.hold;
      if (beat < moving) {
        return frames[stage.from].pose;
      }
      if (beat < moving + stage.move) {
        const t = (beat - moving) / stage.move;
        const eased = t * t * (3 - 2 * t); // arranca y frena suave
        return mix(frames[stage.from].pose, frames[stage.to].pose, eased);
      }
      start = moving + stage.move;
    }
    return frames[0].pose;
  };

  return { poses: Array.from({ length: count }, (_, index) => poseAt((index / count) * beats)), seconds };
}

export interface RenderShape {
  kind: Shape['kind'];
  cls: string;
  attrs: Record<string, string | number>;
  text?: string;
  /** Atributos que cambian a lo largo del bucle, con todos sus valores separados por `;`. */
  animations: { attr: string; values: string }[];
}

export interface RenderModel {
  shapes: RenderShape[];
  /** Duración del bucle; 0 si la imagen es fija. */
  seconds: number;
}

function attributes(shape: Shape): Record<string, string | number> {
  switch (shape.kind) {
    case 'path':
      return shape.opacity === undefined ? { d: shape.d } : { d: shape.d, opacity: shape.opacity };
    case 'circle':
      return { cx: shape.cx, cy: shape.cy, r: shape.r };
    case 'text':
      return { x: shape.x, y: shape.y };
  }
}

/** Postura que representa al ejercicio cuando la imagen no se mueve. */
export function stillPose<P>(illustration: IllustrationBase<P>): P {
  return illustration.frames[illustration.still ?? illustration.frames.length - 1].pose;
}

function numbersOf(shape: Shape): number[] {
  if (shape.kind === 'circle') {
    return [shape.cx, shape.cy, shape.r];
  }
  return shape.kind === 'path' ? (shape.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number) : [];
}

/** Cuánto llega a moverse un punto entre dos fotogramas seguidos, contando el cierre del bucle. */
function largestStep(frames: Shape[][]): number {
  let largest = 0;
  frames.forEach((frame, index) => {
    const previous = frames[(index + frames.length - 1) % frames.length];
    frame.forEach((shape, position) => {
      const before = numbersOf(previous[position]);
      numbersOf(shape).forEach((value, at) => {
        largest = Math.max(largest, Math.abs(value - before[at]));
      });
    });
  });
  return largest;
}

/** Modelo listo para pintar: fijo (miniaturas) o animado (reproductor y ficha). */
export function buildModel(illustration: Illustration, animated: boolean): RenderModel {
  let seconds = 0;
  let frames = [drawFrame(illustration, stillPose<FigurePose | ForearmPose>(illustration))];
  if (animated) {
    for (let perSecond = SAMPLES_PER_SECOND; perSecond <= MAX_SAMPLES_PER_SECOND; perSecond *= 2) {
      const sampled = sampleLoop<FigurePose | ForearmPose>(illustration, perSecond);
      seconds = Math.round(sampled.seconds * 100) / 100;
      frames = sampled.poses.map((pose) => drawFrame(illustration, pose));
      if (largestStep(frames) <= SMOOTH_STEP) {
        break;
      }
    }
  }

  const shapes = frames[0].map((shape, index): RenderShape => {
    const attrs = attributes(shape);
    const animations =
      frames.length < 2
        ? []
        : Object.keys(attrs).flatMap((attr) => {
            const values = frames.map((frame) => attributes(frame[index])[attr]);
            return values.every((value) => value === values[0])
              ? []
              : [{ attr, values: [...values, values[0]].join(';') }];
          });
    return { kind: shape.kind, cls: shape.cls, attrs, animations, ...(shape.kind === 'text' ? { text: shape.text } : {}) };
  });
  return { shapes, seconds: frames.length < 2 ? 0 : seconds };
}
