import type { CSSProperties } from 'react';
import type { RiskLevel, SkillLevel } from './types';

// Aspecto de cada zona. Las zonas llegan del servidor; una zona nueva sin
// color propio usa el de las rutinas generales.

interface ZoneLook {
  soft: string;
  strong: string;
}

const LOOKS: Record<string, ZoneLook> = {
  ELBOW: { soft: 'var(--elbow)', strong: 'var(--elbow-strong)' },
  SHOULDER: { soft: 'var(--shoulder)', strong: 'var(--shoulder-strong)' },
  KNEE: { soft: 'var(--knee)', strong: 'var(--knee-strong)' },
};

const GENERAL: ZoneLook = { soft: 'var(--general)', strong: 'var(--general-strong)' };

export function zoneLook(code: string | null | undefined): ZoneLook {
  return (code ? LOOKS[code] : undefined) ?? GENERAL;
}

/** Variables CSS --zone y --zone-strong para pintar una tarjeta con el color de su zona. */
export function zoneVars(code: string | null | undefined): CSSProperties {
  const look = zoneLook(code);
  return { '--zone': look.soft, '--zone-strong': look.strong } as CSSProperties;
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  LOW: 'Riesgo bajo',
  MODERATE: 'Riesgo medio',
  HIGH: 'Riesgo alto',
};

export const LEVEL_LABEL: Record<SkillLevel, string> = {
  BEGINNER: 'Iniciación',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};
