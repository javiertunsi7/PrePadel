import type { PainEntry, PlayerState, Program } from './types';

/** Cierre de un programa terminado: lo que ha hecho el jugador y cómo ha ido su registro de dolor en la zona. */
export interface ProgramSummary {
  /** Al terminar, todas las sesiones del programa. */
  sessions: number;
  weeks: number;
  startedAt: string;
  /** Último registro de dolor de la zona antes de empezar; null si no hay. */
  painBefore: PainEntry | null;
  /** Último registro de dolor de la zona desde que empezó; null si no hay. */
  painLatest: PainEntry | null;
  /** Diferencia entre los dos registros; null si falta alguno. */
  painChange: number | null;
}

/**
 * Resumen del programa si es el activo y está terminado; si no, null. El dolor sale de lo
 * guardado en el móvil (también lo pendiente de enviar) y de lo que el servidor manda aparte
 * por si es más antiguo que la lista. Si faltan registros se queda en null: nada inventado.
 */
export function programSummary(me: PlayerState, program: Program): ProgramSummary | null {
  const enrollment = me.enrollment;
  if (!enrollment || enrollment.programSlug !== program.slug || !enrollment.completed) {
    return null;
  }
  const start = Date.parse(enrollment.startedAt);
  let painBefore: PainEntry | null = null;
  let painLatest: PainEntry | null = null;
  for (const entry of [...me.pain, me.programPain?.beforeStart, me.programPain?.latest]) {
    if (!entry || entry.zone !== program.zone) {
      continue;
    }
    if (Date.parse(entry.recordedAt) <= start) {
      painBefore = later(painBefore, entry);
    } else {
      painLatest = later(painLatest, entry);
    }
  }
  return {
    sessions: enrollment.totalWeeks * enrollment.sessionsPerWeek,
    weeks: enrollment.totalWeeks,
    startedAt: enrollment.startedAt,
    painBefore,
    painLatest,
    painChange: painBefore && painLatest ? painLatest.score - painBefore.score : null,
  };
}

function later(current: PainEntry | null, candidate: PainEntry): PainEntry {
  return current && Date.parse(current.recordedAt) >= Date.parse(candidate.recordedAt) ? current : candidate;
}
