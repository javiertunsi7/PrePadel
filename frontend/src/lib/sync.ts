import type { Content, Enrollment, PainContext, PlayerState, PushTarget } from './types';

/**
 * Lo que el jugador hace en la app. Cada acción se aplica en local al instante
 * y se guarda en una cola hasta que el servidor la confirma, así la rutina del
 * día funciona sin cobertura. El `id` lo genera el móvil para que reenviar una
 * acción no la duplique en el servidor.
 */
export type Mutation =
  | { kind: 'completion'; id: string; routineSlug: string; completedAt: string }
  | { kind: 'pain'; id: string; zone: string; score: number; context: PainContext; recordedAt: string }
  | { kind: 'enroll'; id: string; programSlug: string }
  // Partido con aviso del servidor (app cerrada). Volver a enviar el mismo matchId le cambia la hora.
  | {
      kind: 'match';
      id: string;
      matchId: string;
      matchAt: string;
      weekly: boolean;
      timeZone: string | null;
      subscription: PushTarget;
    }
  | { kind: 'match-removal'; id: string; matchId: string }
  // Formato antiguo, de cuando solo cabía un partido: solo llega de colas guardadas antes de
  // admitir varios. Hora del partido para el aviso con la app cerrada; sin hora, se cancela.
  | {
      kind: 'reminder';
      id: string;
      matchAt: string | null;
      subscription: PushTarget | null;
      weekly: boolean;
      timeZone: string | null;
    }
  // Salir de una rutina a medias: no cambia nada en la app, solo cuenta para saber dónde se abandona.
  | { kind: 'abandonment'; id: string; routineSlug: string; exerciseSlug: string; abandonedAt: string };

/** Petición al servidor para una acción. Todas devuelven el estado del jugador. */
export type ApiRequest = { method: 'POST'; path: string; body: unknown } | { method: 'DELETE'; path: string };

export function toRequest(mutation: Mutation): ApiRequest {
  switch (mutation.kind) {
    case 'completion':
      return {
        method: 'POST',
        path: '/me/completions',
        body: { id: mutation.id, routineSlug: mutation.routineSlug, completedAt: mutation.completedAt },
      };
    case 'pain':
      return {
        method: 'POST',
        path: '/me/pain',
        body: {
          id: mutation.id,
          zone: mutation.zone,
          score: mutation.score,
          context: mutation.context,
          recordedAt: mutation.recordedAt,
        },
      };
    case 'enroll':
      return { method: 'POST', path: '/me/enrollment', body: { programSlug: mutation.programSlug } };
    case 'match':
      return {
        method: 'POST',
        path: '/me/matches',
        body: {
          id: mutation.matchId,
          matchAt: mutation.matchAt,
          weekly: mutation.weekly,
          timeZone: mutation.timeZone,
          subscription: mutation.subscription,
        },
      };
    case 'match-removal':
      return { method: 'DELETE', path: `/me/matches/${encodeURIComponent(mutation.matchId)}` };
    case 'reminder':
      return {
        method: 'POST',
        path: '/me/reminder',
        body: {
          matchAt: mutation.matchAt,
          subscription: mutation.subscription,
          weekly: mutation.weekly ?? false,
          timeZone: mutation.timeZone ?? null,
        },
      };
    case 'abandonment':
      return {
        method: 'POST',
        path: '/me/abandonments',
        body: {
          id: mutation.id,
          routineSlug: mutation.routineSlug,
          exerciseSlug: mutation.exerciseSlug,
          abandonedAt: mutation.abandonedAt,
        },
      };
  }
}

/** Refleja la acción en el estado local sin esperar al servidor (mismas reglas que el backend). */
export function applyOptimistic(state: PlayerState, mutation: Mutation, content: Content | null): PlayerState {
  switch (mutation.kind) {
    case 'abandonment':
    case 'match':
    case 'match-removal':
    case 'reminder':
      return state;
    case 'completion': {
      if (state.recentCompletions.some((completion) => completion.id === mutation.id)) {
        return state;
      }
      return {
        ...state,
        recentCompletions: [
          { id: mutation.id, routineSlug: mutation.routineSlug, completedAt: mutation.completedAt },
          ...state.recentCompletions,
        ],
        enrollment: advanceEnrollment(state.enrollment, mutation.routineSlug, content),
      };
    }
    case 'pain': {
      if (state.pain.some((entry) => entry.id === mutation.id)) {
        return state;
      }
      return {
        ...state,
        pain: [
          {
            id: mutation.id,
            zone: mutation.zone,
            score: mutation.score,
            context: mutation.context,
            recordedAt: mutation.recordedAt,
          },
          ...state.pain,
        ],
        // El nivel de riesgo lo recalcula el servidor al sincronizar.
        risk: state.risk.map((risk) => (risk.zone === mutation.zone ? { ...risk, lastPain: mutation.score } : risk)),
      };
    }
    case 'enroll': {
      const program = content?.programs.find((candidate) => candidate.slug === mutation.programSlug);
      const current = state.enrollment;
      if (!program || (current && current.programSlug === program.slug && !current.completed)) {
        return state;
      }
      return {
        ...state,
        enrollment: {
          programSlug: program.slug,
          currentWeek: 1,
          totalWeeks: program.weeks.length,
          sessionsDoneThisWeek: 0,
          sessionsPerWeek: program.sessionsPerWeek,
          routineSlug: program.weeks[0].routineSlug,
          completed: false,
          startedAt: new Date().toISOString(),
        },
      };
    }
  }
}

/** Una sesión más del programa; al llegar a las sesiones de la semana se abre la siguiente. */
function advanceEnrollment(
  enrollment: Enrollment | null,
  routineSlug: string,
  content: Content | null,
): Enrollment | null {
  if (!enrollment || enrollment.completed || enrollment.routineSlug !== routineSlug) {
    return enrollment;
  }
  const done = enrollment.sessionsDoneThisWeek + 1;
  if (done < enrollment.sessionsPerWeek) {
    return { ...enrollment, sessionsDoneThisWeek: done };
  }
  if (enrollment.currentWeek >= enrollment.totalWeeks) {
    return { ...enrollment, sessionsDoneThisWeek: done, completed: true };
  }
  const program = content?.programs.find((candidate) => candidate.slug === enrollment.programSlug);
  const nextWeek = program?.weeks.find((week) => week.week === enrollment.currentWeek + 1);
  if (!nextWeek) {
    return { ...enrollment, sessionsDoneThisWeek: done };
  }
  return { ...enrollment, currentWeek: nextWeek.week, sessionsDoneThisWeek: 0, routineSlug: nextWeek.routineSlug };
}

export function newId(): string {
  return crypto.randomUUID();
}
