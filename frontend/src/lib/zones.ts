import type { CSSProperties } from 'react';
import type { RiskLevel, SkillLevel } from './types';

// Aspecto de cada zona. Las zonas llegan del servidor; una zona nueva sin
// color propio usa el de las rutinas generales.

interface ZoneLook {
  /** Pastel y fuerte: pintan la figura de cada ejercicio, sobre tarjeta clara. */
  soft: string;
  strong: string;
  /** Marca la zona en los iconos, sobre el fondo oscuro. */
  accent: string;
}

const LOOKS: Record<string, ZoneLook> = {
  ELBOW: { soft: 'var(--elbow)', strong: 'var(--elbow-strong)', accent: 'var(--elbow-accent)' },
  SHOULDER: { soft: 'var(--shoulder)', strong: 'var(--shoulder-strong)', accent: 'var(--shoulder-accent)' },
  KNEE: { soft: 'var(--knee)', strong: 'var(--knee-strong)', accent: 'var(--knee-accent)' },
};

const GENERAL: ZoneLook = {
  soft: 'var(--general)',
  strong: 'var(--general-strong)',
  accent: 'var(--general-accent)',
};

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
