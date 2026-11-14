import { describe, expect, it } from 'vitest';
import { content, playerState } from '../test/fixtures';
import { programSummary } from './summary';
import type { Enrollment, PainEntry } from './types';

/** Codo de pádel en el catálogo de prueba: zona ELBOW, 2 semanas de 3 sesiones. */
const program = content.programs[0];

const completed: Enrollment = {
  programSlug: 'codo-de-padel',
  currentWeek: 2,
  totalWeeks: 2,
  sessionsDoneThisWeek: 3,
  sessionsPerWeek: 3,
  routineSlug: 'codo-semana-2',
  completed: true,
  startedAt: '2026-10-01T10:00:00Z',
};

function pain(id: string, zone: string, score: number, recordedAt: string): PainEntry {
  return { id, zone, score, context: 'POST_MATCH', recordedAt };
}

describe('resumen al terminar un programa', () => {
  it('solo lo hay para el programa activo y terminado', () => {
    expect(programSummary(playerState(), program)).toBeNull();
    expect(programSummary(playerState({ enrollment: { ...completed, completed: false } }), program)).toBeNull();
    expect(
      programSummary(playerState({ enrollment: { ...completed, programSlug: 'rodilla-estable' } }), program),
    ).toBeNull();
  });

  it('compara el último dolor de la zona antes de empezar con el último desde entonces', () => {
    const me = playerState({
      enrollment: completed,
      pain: [
        pain('rodilla', 'KNEE', 1, '2026-11-12T19:00:00Z'),
        pain('ultimo', 'ELBOW', 2, '2026-11-10T19:00:00Z'),
        pain('durante', 'ELBOW', 5, '2026-10-15T19:00:00Z'),
        pain('al-empezar', 'ELBOW', 6, '2026-10-01T10:00:00Z'),
        pain('antiguo', 'ELBOW', 8, '2026-09-01T10:00:00Z'),
      ],
    });

    expect(programSummary(me, program)).toEqual({
      sessions: 6,
      weeks: 2,
      startedAt: '2026-10-01T10:00:00Z',
      painBefore: expect.objectContaining({ id: 'al-empezar', score: 6 }),
      painLatest: expect.objectContaining({ id: 'ultimo', score: 2 }),
      painChange: -4,
    });
  });

  it('sin registros de dolor lo deja en blanco en vez de inventar', () => {
    const summary = programSummary(playerState({ enrollment: completed, programPain: null }), program);

    expect(summary).toMatchObject({ sessions: 6, painBefore: null, painLatest: null, painChange: null });
  });

  it('sin registros desde que empezó no hay comparación', () => {
    const me = playerState({ enrollment: completed, pain: [pain('al-empezar', 'ELBOW', 6, '2026-09-30T10:00:00Z')] });

    expect(programSummary(me, program)).toMatchObject({
      painBefore: { score: 6 },
      painLatest: null,
      painChange: null,
    });
  });

  it('usa los registros antiguos que manda el servidor aparte, y los del móvil si son más nuevos', () => {
    const me = playerState({
      enrollment: completed,
      pain: [pain('sin-enviar', 'ELBOW', 3, '2026-11-14T09:00:00Z')],
      programPain: {
        beforeStart: pain('hace-meses', 'ELBOW', 7, '2026-06-01T10:00:00Z'),
        latest: pain('del-servidor', 'ELBOW', 4, '2026-11-01T10:00:00Z'),
      },
    });

    expect(programSummary(me, program)).toMatchObject({
      painBefore: { id: 'hace-meses', score: 7 },
      painLatest: { id: 'sin-enviar', score: 3 },
      painChange: -4,
    });
  });
});
