import { describe, expect, it } from 'vitest';
import { content, playerState } from '../test/fixtures';
import { applyOptimistic, toRequest, type Mutation } from './sync';
import type { Enrollment } from './types';

// El programa de prueba tiene 2 semanas de 3 sesiones.
function enrollment(overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    programSlug: 'codo-de-padel',
    currentWeek: 1,
    totalWeeks: 2,
    sessionsDoneThisWeek: 0,
    sessionsPerWeek: 3,
    routineSlug: 'codo-semana-1',
    completed: false,
    startedAt: '2026-11-01T10:00:00Z',
    ...overrides,
  };
}

function completion(routineSlug: string, id = 'c-1'): Mutation {
  return { kind: 'completion', id, routineSlug, completedAt: '2026-11-10T18:00:00Z' };
}

describe('rutinas terminadas, aplicadas en local', () => {
  it('una sesión del programa suma en la semana en curso', () => {
    const next = applyOptimistic(playerState({ enrollment: enrollment() }), completion('codo-semana-1'), content);

    expect(next.recentCompletions[0]).toMatchObject({ id: 'c-1', routineSlug: 'codo-semana-1' });
    expect(next.enrollment).toMatchObject({ currentWeek: 1, sessionsDoneThisWeek: 1 });
  });

  it('la tercera sesión abre la semana siguiente con su rutina', () => {
    const state = playerState({ enrollment: enrollment({ sessionsDoneThisWeek: 2 }) });

    expect(applyOptimistic(state, completion('codo-semana-1'), content).enrollment).toMatchObject({
      currentWeek: 2,
      sessionsDoneThisWeek: 0,
      routineSlug: 'codo-semana-2',
      completed: false,
    });
  });

  it('la última sesión de la última semana completa el programa', () => {
    const state = playerState({
      enrollment: enrollment({ currentWeek: 2, sessionsDoneThisWeek: 2, routineSlug: 'codo-semana-2' }),
    });

    expect(applyOptimistic(state, completion('codo-semana-2'), content).enrollment).toMatchObject({
      currentWeek: 2,
      completed: true,
    });
  });

  it('el calentamiento se guarda pero no cuenta como sesión del programa', () => {
    const state = playerState({ enrollment: enrollment({ sessionsDoneThisWeek: 1 }) });
    const next = applyOptimistic(state, completion('calentamiento-prepartido'), content);

    expect(next.recentCompletions).toHaveLength(1);
    expect(next.enrollment?.sessionsDoneThisWeek).toBe(1);
  });

  it('aplicar dos veces la misma acción no la duplica', () => {
    const once = applyOptimistic(playerState({ enrollment: enrollment() }), completion('codo-semana-1'), content);

    expect(applyOptimistic(once, completion('codo-semana-1'), content)).toBe(once);
  });
});

describe('dolor y programas, aplicados en local', () => {
  it('el dolor registrado pasa a ser el último de su zona', () => {
    const next = applyOptimistic(
      playerState(),
      { kind: 'pain', id: 'p-1', zone: 'KNEE', score: 4, context: 'POST_MATCH', recordedAt: '2026-11-10T20:00:00Z' },
      content,
    );

    expect(next.pain[0]).toMatchObject({ zone: 'KNEE', score: 4 });
    expect(next.risk.find((risk) => risk.zone === 'KNEE')?.lastPain).toBe(4);
    expect(next.risk.find((risk) => risk.zone === 'ELBOW')?.lastPain).toBe(6);
  });

  it('empezar un programa coloca al jugador en la primera sesión de la semana 1', () => {
    const next = applyOptimistic(playerState(), { kind: 'enroll', id: 'e-1', programSlug: 'codo-de-padel' }, content);

    expect(next.enrollment).toMatchObject({
      programSlug: 'codo-de-padel',
      currentWeek: 1,
      totalWeeks: 2,
      sessionsDoneThisWeek: 0,
      sessionsPerWeek: 3,
      routineSlug: 'codo-semana-1',
    });
  });

  it('volver a empezar el programa en curso no pierde el progreso', () => {
    const state = playerState({ enrollment: enrollment({ currentWeek: 2, sessionsDoneThisWeek: 1 }) });

    expect(applyOptimistic(state, { kind: 'enroll', id: 'e-1', programSlug: 'codo-de-padel' }, content)).toBe(state);
  });

  it('un programa completado sí se puede repetir desde el principio', () => {
    const state = playerState({ enrollment: enrollment({ currentWeek: 2, completed: true }) });
    const next = applyOptimistic(state, { kind: 'enroll', id: 'e-1', programSlug: 'codo-de-padel' }, content);

    expect(next.enrollment).toMatchObject({ currentWeek: 1, completed: false });
  });
});

describe('peticiones al servidor', () => {
  it('cada acción va a su ruta con el id generado en el móvil', () => {
    expect(toRequest(completion('codo-semana-1', 'abc'))).toEqual({
      path: '/me/completions',
      body: { id: 'abc', routineSlug: 'codo-semana-1', completedAt: '2026-11-10T18:00:00Z' },
    });
    expect(toRequest({ kind: 'enroll', id: 'e-1', programSlug: 'codo-de-padel' })).toEqual({
      path: '/me/enrollment',
      body: { programSlug: 'codo-de-padel' },
    });
  });
});
