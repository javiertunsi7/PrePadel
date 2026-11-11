import {
  ANKLE_Y as FLOOR,
  HIP_Y as HIP,
  dir,
  type FigurePose,
  type ForearmPose,
  type Illustration,
  type Limb,
  type Vec,
} from './engine';

// Una ilustración por ejercicio del catálogo (misma clave que `exercise.slug`
// en el backend). Son esquemas dibujados a partir de la descripción de cada
// ejercicio: como el resto del contenido, están pendientes de que los revise
// un fisioterapeuta.
//
// Para añadir un ejercicio: describe sus posturas clave con `side()` o
// `front()` y míralo en /dev/ilustraciones (solo en desarrollo).

/** Brazo o pierna por ángulos: 0 = hacia abajo, 90 = hacia +x, 180 = arriba. */
const fk = (upper: number, lower: number): Limb => ({ a: [upper, lower] });
/** Brazo o pierna que llega a un punto; `bend` elige hacia dónde dobla. */
const to = (x: number, y: number, bend: number): Limb => ({ to: [x, y], bend });
/** Brazo con el codo y la mano puestos a mano (escorzos). */
const via = (elbowX: number, elbowY: number, x: number, y: number): Limb => ({ via: [elbowX, elbowY], to: [x, y] });

/** De pie, de lado y mirando a la derecha, con la cadera en `x`. */
function side(x: number, changes: Partial<FigurePose> = {}): FigurePose {
  return {
    pelvis: [x, HIP],
    lean: 0,
    head: 0,
    turn: 0,
    armA: fk(6, 14),
    armB: fk(-6, 6),
    legA: to(x + 1.5, FLOOR, 1),
    legB: to(x - 1.5, FLOOR, 1),
    footA: 90,
    footB: 90,
    ...changes,
  };
}

/** De pie y de frente, con la cadera en `x`. */
function front(x: number, changes: Partial<FigurePose> = {}): FigurePose {
  return {
    pelvis: [x, HIP],
    lean: 0,
    head: 0,
    turn: 0,
    armA: fk(10, 6),
    armB: fk(-10, -6),
    legA: to(x + 6.5, FLOOR, 1),
    legB: to(x - 6.5, FLOOR, -1),
    footA: 55,
    footB: -55,
    ...changes,
  };
}

const forearm = (wrist: number, squeeze = 0, helper = 0): ForearmPose => ({ wrist, squeeze, helper });

// --- Posturas con algo de cálculo -------------------------------------------

/** Posición de espera de pádel, con los pies separados `half` a cada lado. */
function ready(x: number, half: number, y: number): FigurePose {
  return front(x, {
    pelvis: [x, y],
    legA: to(x + half, FLOOR, 1),
    legB: to(x - half, FLOOR, -1),
    armA: to(x + 6, y - 9, 1),
    armB: to(x - 6, y - 9, -1),
  });
}

/** Tronco girado `turn` grados con la pala apoyada sobre los hombros. */
function twist(turn: number): FigurePose {
  const width = Math.cos((turn * Math.PI) / 180);
  const tilt = turn / 48;
  return front(60, {
    turn,
    lean: tilt * 3,
    legA: to(69, FLOOR, 1),
    legB: to(51, FLOOR, -1),
    armA: via(60 + 17 * width, 41 - tilt * 1.5, 60 + 21.5 * width, 30 - tilt * 2.5),
    armB: via(60 - 17 * width, 41 + tilt * 1.5, 60 - 21.5 * width, 30 + tilt * 2.5),
  });
}

/** Manos entrelazadas delante del pecho, en el punto (x, y). */
const clasp = (x: number, y: number): FigurePose =>
  front(60, { armA: to(x + 1.2, y, 1), armB: to(x - 1.2, y, -1) });

/** Los dos brazos iguales, en espejo. */
const arms = (upper: number, lower: number): FigurePose =>
  front(60, { armA: fk(upper, lower), armB: fk(-upper, -lower) });

/** Flexión contra la pared: el cuerpo, recto, se inclina `degrees` desde los pies. */
function wallPushUp(degrees: number): FigurePose {
  const [x, y] = dir(180 - degrees);
  const pelvis: Vec = [49 + 42 * x, FLOOR + 42 * y];
  return side(49, {
    pelvis,
    lean: degrees,
    legA: to(50.5, FLOOR, 1),
    legB: to(47.5, FLOOR, 1),
    armA: to(95, 39, -1),
    armB: to(95, 41.5, -1),
  });
}

/** Remo con banda: manos en (x, 47), codos hacia atrás. */
const row = (x: number): FigurePose =>
  side(40, {
    pelvis: [40, HIP + 2],
    legA: to(44, FLOOR, 1),
    legB: to(37, FLOOR, 1),
    armA: to(x, 47, -1),
    armB: to(x - 2, 48.5, -1),
  });

/** Zancada lateral vista de frente. */
function lateral(x: number, y: number, lean: number, footA: number, footB: number): FigurePose {
  return front(60, {
    pelvis: [x, y],
    lean,
    legA: to(footA, FLOOR, 1),
    legB: to(footB, FLOOR, -1),
    armA: to(x + 1.5, y - 14, 1),
    armB: to(x - 1.5, y - 14, -1),
  });
}

/** Media sentadilla con banda en las rodillas y manos en la cintura. */
const bandStep = (x: number, half: number, y: number): FigurePose =>
  front(60, {
    pelvis: [x, y],
    legA: to(x + half, FLOOR, 1),
    legB: to(x - half, FLOOR, -1),
    armA: to(x + 8, y - 2, 1),
    armB: to(x - 8, y - 2, -1),
  });

const standing = side(66, { armA: to(68, HIP - 1, -1), armB: to(66, HIP - 1, -1) });
const marchMiddle = side(50, { legA: fk(0, 0), legB: fk(0, 0), armA: fk(5, 62), armB: fk(5, 62) });
const lateralStand = lateral(60, HIP, 0, 66.5, 53.5);

export const ILLUSTRATIONS: Record<string, Illustration> = {
  // ------------------------------------------------------------- Generales
  'marcha-activa': {
    kind: 'figure',
    view: 'side',
    loop: 'cycle',
    beat: 0.42,
    still: 0,
    frames: [
      { pose: side(50, { legA: fk(86, 4), legB: fk(0, 0), armA: fk(-32, 20), armB: fk(42, 105) }), hold: 0.3 },
      { pose: marchMiddle, hold: 0 },
      { pose: side(50, { legA: fk(0, 0), legB: fk(86, 4), armA: fk(42, 105), armB: fk(-32, 20) }), hold: 0.3 },
      { pose: marchMiddle, hold: 0 },
    ],
  },
  'pasos-laterales': {
    kind: 'figure',
    view: 'front',
    beat: 0.5,
    frames: [{ pose: ready(44, 11, 65) }, { pose: ready(60, 7.5, 63), hold: 0 }, { pose: ready(76, 11, 65) }],
    arrows: ['M52 0 L32 0', 'M68 0 L88 0'],
  },
  'rotaciones-tronco': {
    kind: 'figure',
    view: 'front',
    beat: 0.8,
    frames: [{ pose: twist(-48) }, { pose: twist(0), hold: 0 }, { pose: twist(48) }],
    props: [{ type: 'bar' }],
    arrows: ['M57 1 Q48 0 42 6', 'M63 1 Q72 0 78 6'],
  },
  'golpes-sombra': {
    kind: 'figure',
    view: 'side',
    frames: [
      {
        pose: side(54, {
          pelvis: [54, HIP + 3],
          lean: 4,
          legA: to(64, FLOOR, 1),
          legB: to(44, FLOOR, 1),
          armA: fk(-50, -75),
          armB: fk(50, 75),
          racket: -125,
        }),
        hold: 0.4,
        move: 0.9,
      },
      {
        pose: side(54, {
          pelvis: [60, HIP + 3],
          lean: 2,
          legA: to(64, FLOOR, 1),
          legB: to(44, FLOOR, 1),
          armA: fk(100, 150),
          armB: fk(-20, 30),
          racket: 165,
        }),
        hold: 0.35,
        move: 1.3,
      },
    ],
  },
  'respiracion-calma': {
    kind: 'figure',
    view: 'front',
    beat: 0.8,
    still: 0,
    frames: [
      { pose: arms(12, 8), hold: 0.2, move: 2 },
      { pose: front(60, { pelvis: [60, HIP - 0.8], armA: fk(40, 32), armB: fk(-40, -32) }), hold: 0.3, move: 3 },
    ],
    note: 'Toma aire en 4, suéltalo en 6',
  },

  // ------------------------------------------------------------------ Codo
  'movilidad-muneca': {
    kind: 'figure',
    view: 'front',
    loop: 'cycle',
    beat: 0.45,
    frames: [
      { pose: clasp(55.5, 50), hold: 0 },
      { pose: clasp(60, 46.5), hold: 0 },
      { pose: clasp(64.5, 50), hold: 0 },
      { pose: clasp(60, 53.5), hold: 0 },
    ],
    focus: ['handA'],
  },
  'isometrico-extensores': {
    kind: 'forearm',
    frames: [
      { pose: forearm(14, 0, 1), hold: 0.6, move: 0.6 },
      { pose: forearm(10, 0, 1), hold: 0.6, move: 0.6 },
    ],
    arrows: ['M104 22 L104 40'],
    note: 'Palma hacia abajo',
  },
  'excentrico-extensores': {
    kind: 'forearm',
    object: 'bottle',
    loop: 'cycle',
    still: 1,
    frames: [
      { pose: forearm(-32), hold: 0.3, move: 0.9 },
      { pose: forearm(34, 0, 1), hold: 0.3, move: 0.35 },
      { pose: forearm(34), hold: 0.2, move: 2.6 },
    ],
    arrows: ['M110 40 Q116 60 106 80'],
    note: 'Palma hacia abajo',
  },
  'flexion-muneca-peso': {
    kind: 'forearm',
    object: 'bottle',
    frames: [
      { pose: forearm(-28), move: 1.2 },
      { pose: forearm(42), move: 1.2 },
    ],
    note: 'Palma hacia arriba',
  },
  'pronosupinacion-pala': {
    kind: 'figure',
    view: 'front',
    frames: [
      { pose: front(52, { armA: via(64, 47.5, 63, 50), racket: 250 }), hold: 0.4, move: 1.3 },
      { pose: front(52, { armA: via(64, 47.5, 63, 50), racket: 110 }), hold: 0.4, move: 1.3 },
    ],
    focus: ['elbowA'],
    note: 'Codo pegado al cuerpo',
  },
  'apreton-pelota': {
    kind: 'forearm',
    object: 'ball',
    frames: [
      { pose: forearm(0, 0), hold: 0.9, move: 0.45 },
      { pose: forearm(0, 1), hold: 0.9, move: 0.45 },
    ],
    note: 'Aprieta 5 s, suelta 5 s',
  },
  'estiramiento-extensores': {
    kind: 'figure',
    view: 'side',
    frames: [{ pose: side(46, { turn: 22, armA: fk(84, 84), handA: 8, armB: to(74.4, 40, -1) }) }],
    focus: ['forearmA'],
    note: 'Palma hacia abajo',
  },
  'estiramiento-flexores': {
    kind: 'figure',
    view: 'side',
    frames: [{ pose: side(46, { turn: 22, armA: fk(84, 84), handA: -14, armB: to(72.6, 40.2, -1) }) }],
    focus: ['forearmA'],
    note: 'Palma hacia arriba',
  },

  // ---------------------------------------------------------------- Hombro
  'circulos-brazos': {
    kind: 'figure',
    view: 'front',
    loop: 'cycle',
    beat: 0.3,
    frames: [
      { pose: arms(82, 86), hold: 0 },
      { pose: arms(90, 97), hold: 0 },
      { pose: arms(98, 94), hold: 0 },
      { pose: arms(90, 83), hold: 0 },
    ],
    focus: ['shoulderA', 'shoulderB'],
    arrows: ['M108.5 33.7 A8 8 0 1 1 105 24.1', 'M11.5 33.7 A8 8 0 1 0 15 24.1'],
  },
  'deslizamiento-pared': {
    kind: 'figure',
    view: 'front',
    still: 0,
    frames: [
      { pose: arms(92, 180), move: 1.2 },
      { pose: arms(150, 174), move: 1.2 },
    ],
    props: [{ type: 'backwall' }],
    focus: ['shoulderA', 'shoulderB'],
  },
  'isometrico-rotacion-externa': {
    kind: 'figure',
    view: 'front',
    frames: [
      { pose: front(48, { armA: via(59.5, 47.5, 72, 47.5) }), hold: 0.5, move: 0.5 },
      { pose: front(48, { armA: via(59.5, 47.5, 73, 47.5) }), hold: 0.7, move: 0.5 },
    ],
    props: [{ type: 'wall', x: 76, width: 10 }],
    focus: ['shoulderA'],
    arrows: ['M60 57 L72 57'],
  },
  'rotacion-externa-banda': {
    kind: 'figure',
    view: 'front',
    frames: [
      { pose: front(60, { armA: via(71.5, 47.5, 60, 49) }), hold: 0.3 },
      { pose: front(60, { armA: via(71.5, 47.5, 85, 47.5) }), hold: 0.5, move: 1.4 },
    ],
    props: [
      { type: 'post', x: 12, top: 38 },
      { type: 'elastic', from: [12, 47.5], to: 'handA' },
    ],
    focus: ['shoulderA'],
  },
  'rotacion-interna-banda': {
    kind: 'figure',
    view: 'front',
    frames: [
      { pose: front(52, { armA: via(63.5, 47.5, 77, 47.5) }), hold: 0.3 },
      { pose: front(52, { armA: via(63.5, 47.5, 52, 49) }), hold: 0.5, move: 1.4 },
    ],
    props: [
      { type: 'post', x: 108, top: 38 },
      { type: 'elastic', from: [108, 47.5], to: 'handA' },
    ],
    focus: ['shoulderA'],
  },
  'remo-banda': {
    kind: 'figure',
    view: 'side',
    frames: [
      { pose: row(67), hold: 0.3 },
      { pose: row(45), hold: 0.5, move: 1.2 },
    ],
    props: [
      { type: 'post', x: 108, top: 36 },
      { type: 'elastic', from: [108, 47], to: 'handA' },
      { type: 'elastic', from: [108, 48.5], to: 'handB' },
    ],
    focus: ['shoulderA'],
  },
  'flexion-pared': {
    kind: 'figure',
    view: 'side',
    still: 0,
    frames: [
      { pose: wallPushUp(26), hold: 0.3 },
      { pose: wallPushUp(14.5), hold: 0.5 },
    ],
    props: [{ type: 'wall', x: 98, width: 10 }],
    focus: ['shoulderA'],
  },
  'ytw-de-pie': {
    kind: 'figure',
    view: 'front',
    loop: 'cycle',
    still: 0,
    frames: [
      { pose: arms(150, 150), hold: 0.8, move: 0.7 },
      { pose: arms(90, 90), hold: 0.8, move: 0.7 },
      { pose: arms(62, 158), hold: 0.8, move: 0.7 },
    ],
    focus: ['shoulderA', 'shoulderB'],
  },
  'estiramiento-hombro-cruzado': {
    kind: 'figure',
    view: 'front',
    frames: [{ pose: front(58, { armB: via(60, 35.5, 76, 36.5), armA: via(74, 46, 64.5, 37) }) }],
    focus: ['shoulderB'],
  },
  'apertura-pecho': {
    kind: 'figure',
    view: 'front',
    frames: [{ pose: front(52, { turn: -30, armA: fk(92, 180) }) }],
    props: [{ type: 'wall', x: 80, width: 9 }],
    focus: ['shoulderA'],
    arrows: ['M60 2 Q50 -3 40 4'],
  },

  // --------------------------------------------------------------- Rodilla
  'saltos-tobillo': {
    kind: 'figure',
    view: 'side',
    beat: 0.3,
    still: 0,
    frames: [
      { pose: side(60, { pelvis: [60, HIP + 3], armA: fk(18, 85), armB: fk(8, 75) }), hold: 0.1 },
      {
        pose: side(60, {
          pelvis: [60, HIP - 6],
          legA: to(61.5, FLOOR - 6.5, 1),
          legB: to(58.5, FLOOR - 6.5, 1),
          footA: 48,
          footB: 48,
          armA: fk(10, 80),
          armB: fk(0, 70),
        }),
        hold: 0.1,
      },
    ],
    focus: ['ankleA'],
  },
  'media-sentadilla': {
    kind: 'figure',
    view: 'side',
    frames: [
      { pose: side(58, { armA: fk(10, 20), armB: fk(0, 10) }), hold: 0.3 },
      { pose: side(58, { pelvis: [51, 66.5], lean: 22, armA: fk(72, 84), armB: fk(66, 78) }), hold: 0.4 },
    ],
    focus: ['kneeA'],
  },
  'zancada-atras': {
    kind: 'figure',
    view: 'side',
    loop: 'cycle',
    still: 1,
    frames: [
      { pose: standing, hold: 0.2 },
      {
        pose: side(66, {
          pelvis: [46.8, 76.9],
          lean: 4,
          legA: to(67.5, FLOOR, 1),
          legB: to(22.3, 95.8, 1),
          footB: 10,
          armA: to(48.8, 75.9, -1),
          armB: to(46.8, 75.9, -1),
        }),
        hold: 0.4,
      },
      { pose: standing, hold: 0.2 },
      {
        pose: side(66, {
          pelvis: [43.8, 76.9],
          lean: 4,
          legA: to(19.3, 95.8, 1),
          legB: to(64.5, FLOOR, 1),
          footA: 10,
          armA: to(45.8, 75.9, -1),
          armB: to(43.8, 75.9, -1),
        }),
        hold: 0.4,
      },
    ],
    focus: ['kneeA', 'kneeB'],
  },
  'zancada-lateral': {
    kind: 'figure',
    view: 'front',
    loop: 'cycle',
    still: 1,
    frames: [
      { pose: lateralStand, hold: 0.2 },
      { pose: lateral(84, 68.5, 5, 103, 53.5), hold: 0.4 },
      { pose: lateralStand, hold: 0.2 },
      { pose: lateral(36, 68.5, -5, 66.5, 17), hold: 0.4 },
    ],
    focus: ['kneeA', 'kneeB'],
  },
  'sentadilla-pared': {
    kind: 'figure',
    view: 'side',
    frames: [
      {
        pose: side(43, {
          pelvis: [43, 71],
          legA: to(61.5, FLOOR, 1),
          legB: to(59.5, FLOOR, 1),
          armA: fk(28, 62),
          armB: fk(22, 56),
        }),
      },
    ],
    props: [{ type: 'wall', x: 28, width: 10 }],
    focus: ['kneeA'],
  },
  'puente-gluteo': {
    kind: 'figure',
    view: 'side',
    frames: [
      {
        pose: side(62, {
          pelvis: [62, 98],
          lean: -90,
          head: 10,
          legA: to(84, FLOOR, 1),
          legB: to(82, FLOOR, 1),
          armA: fk(90, 90),
          armB: fk(90, 90),
        }),
        hold: 0.3,
      },
      {
        pose: side(62, {
          pelvis: [58.4, 84.5],
          lean: -120,
          head: 40,
          legA: to(84, FLOOR, 1),
          legB: to(82, FLOOR, 1),
          armA: fk(90, 90),
          armB: fk(90, 90),
        }),
        hold: 0.6,
        move: 1.2,
      },
    ],
    props: [{ type: 'mat', from: 12, to: 98 }],
    focus: ['pelvis'],
  },
  'sentadilla-silla': {
    kind: 'figure',
    view: 'side',
    still: 1,
    frames: [
      {
        pose: side(62, {
          pelvis: [45, 76.5],
          lean: 6,
          legA: to(64, FLOOR, 1),
          legB: to(62, FLOOR, 1),
          armA: fk(62, 96),
          armB: fk(56, 90),
        }),
        hold: 0.4,
        move: 0.7,
      },
      {
        pose: side(62, {
          pelvis: [53, 69],
          lean: 32,
          legA: to(64, FLOOR, 1),
          legB: to(62, FLOOR, 1),
          armA: fk(70, 92),
          armB: fk(64, 86),
        }),
        hold: 0,
        move: 0.8,
      },
      {
        pose: side(62, {
          pelvis: [62.5, HIP],
          legA: to(64, FLOOR, 1),
          legB: to(62, FLOOR, 1),
          armA: fk(8, 16),
          armB: fk(-2, 8),
        }),
        hold: 0.4,
        move: 1.6,
      },
    ],
    props: [{ type: 'chair', x: 30 }],
    focus: ['kneeA'],
  },
  'pasos-banda': {
    kind: 'figure',
    view: 'front',
    beat: 0.6,
    frames: [{ pose: bandStep(48, 12, 66) }, { pose: bandStep(60, 10, 65), hold: 0 }, { pose: bandStep(72, 12, 66) }],
    props: [{ type: 'kneeBand' }],
    focus: ['pelvis'],
  },
  'subida-escalon': {
    kind: 'figure',
    view: 'side',
    still: 0,
    frames: [
      {
        pose: side(54, {
          pelvis: [54, 62.5],
          lean: 14,
          legA: to(68, 89.5, 1),
          legB: to(48, FLOOR, 1),
          armA: fk(22, 62),
          armB: fk(-14, 30),
        }),
        hold: 0.3,
      },
      {
        pose: side(54, {
          pelvis: [68, 47.5],
          legA: to(68, 89.5, 1),
          legB: to(63, 86, 1),
          footB: 100,
          armA: fk(6, 20),
          armB: fk(-4, 10),
        }),
        hold: 0.4,
        move: 1.8,
      },
    ],
    props: [{ type: 'step', x: 60, width: 32, height: 12 }],
    focus: ['kneeA'],
  },
  'elevacion-talones': {
    kind: 'figure',
    view: 'side',
    frames: [
      { pose: side(60), hold: 0.3, move: 0.7 },
      {
        pose: side(60, {
          pelvis: [60, HIP - 4],
          legA: to(61.5, FLOOR - 4, 1),
          legB: to(58.5, FLOOR - 4, 1),
          footA: 52,
          footB: 52,
        }),
        hold: 0.5,
        move: 1.6,
      },
    ],
    focus: ['calfA'],
  },
  'equilibrio-una-pierna': {
    kind: 'figure',
    view: 'side',
    still: 0,
    frames: [
      {
        pose: side(58, {
          pelvis: [58, HIP + 0.8],
          lean: -2,
          legA: to(58.5, FLOOR, 1),
          legB: fk(38, -28),
          armA: fk(34, 50),
          armB: fk(-30, -8),
        }),
        move: 1.2,
      },
      {
        pose: side(58, {
          pelvis: [58, HIP + 0.8],
          lean: 3,
          legA: to(58.5, FLOOR, 1),
          legB: fk(44, -22),
          armA: fk(26, 44),
          armB: fk(-38, -14),
        }),
        move: 1.2,
      },
    ],
    focus: ['kneeA'],
  },
  'aterrizaje-suave': {
    kind: 'figure',
    view: 'side',
    loop: 'cycle',
    still: 2,
    frames: [
      { pose: side(60, { pelvis: [58, HIP + 5], lean: 12, armA: fk(-25, 10), armB: fk(-30, 5) }), hold: 0.3, move: 0.5 },
      {
        pose: side(60, {
          pelvis: [60, HIP - 9],
          lean: 2,
          legA: to(61.5, FLOOR - 9, 1),
          legB: to(58.5, FLOOR - 9, 1),
          footA: 55,
          footB: 55,
          armA: fk(80, 110),
          armB: fk(70, 100),
        }),
        hold: 0.1,
        move: 0.5,
      },
      { pose: side(60, { pelvis: [53.5, 67.5], lean: 24, armA: fk(68, 82), armB: fk(62, 76) }), hold: 1.4, move: 0.8 },
    ],
    focus: ['kneeA'],
  },
  'estiramiento-cuadriceps': {
    kind: 'figure',
    view: 'side',
    frames: [
      {
        pose: side(60, {
          legB: to(60.5, FLOOR, 1),
          legA: to(49.5, 61, 1),
          footA: 200,
          armA: to(50.5, 60, -1),
          armB: to(84.5, 50, -1),
        }),
      },
    ],
    props: [{ type: 'post', x: 87, top: 44 }],
    focus: ['thighA'],
  },
  'estiramiento-isquios': {
    kind: 'figure',
    view: 'side',
    frames: [
      {
        pose: side(52, {
          pelvis: [52, 64],
          lean: 42,
          legA: to(72.5, FLOOR, 1),
          footA: 150,
          legB: to(54, FLOOR, 1),
          armA: fk(12, 18),
          armB: fk(4, 10),
        }),
      },
    ],
    focus: ['thighA'],
  },
  'estiramiento-gemelo': {
    kind: 'figure',
    view: 'side',
    frames: [
      {
        pose: side(60, {
          pelvis: [61.7, 64.4],
          lean: 22,
          legA: to(74, FLOOR, 1),
          legB: to(42, FLOOR, 1),
          armA: to(95.2, 41, -1),
          armB: to(95.2, 43.5, -1),
        }),
      },
    ],
    props: [{ type: 'wall', x: 98, width: 10 }],
    focus: ['calfB'],
  },
};
