import type { Content, RoutineKind } from './types';

// Textos que se repiten en varias pantallas.

export const DISCLAIMER =
  'PrePádel es acondicionamiento físico y prevención. No es un tratamiento ni sustituye la consulta con tu médico o fisioterapeuta.';

export const KIND_LABEL: Record<RoutineKind, string> = {
  WARMUP: 'Antes del partido',
  RECOVERY: 'Después del partido',
  PROGRAM: 'Sesión de programa',
};

/** Regla "si el dolor supera X o dura más de Y días, consulta", con los umbrales del servidor. */
export function painRuleText(content: Content): string {
  const { consultScore, persistentScore, persistentDays } = content.painRule;
  return `Si el dolor llega a ${consultScore}/10, o se mantiene en ${persistentScore}/10 o más durante ${persistentDays} días, para y consulta con un fisioterapeuta o médico.`;
}

/** Quién ha validado los ejercicios; mientras nadie lo haya hecho, se dice claramente. */
export function reviewText(content: Content): string {
  const { status, reviewerName, reviewerCredentials } = content.review;
  if (status === 'DRAFT' || !reviewerName) {
    return 'Ejercicios en borrador: pendientes de validación por un fisioterapeuta.';
  }
  return `Contenido revisado por ${reviewerName}${reviewerCredentials ? `, ${reviewerCredentials}` : ''}.`;
}

/** Del verde (0) al rojo (10). */
export function painColor(score: number): string {
  return `hsl(${140 - score * 14} 78% 62%)`;
}

export function painWord(score: number): string {
  if (score === 0) {
    return 'Nada';
  }
  if (score <= 3) {
    return 'Leve';
  }
  return score <= 6 ? 'Moderado' : 'Fuerte';
}
