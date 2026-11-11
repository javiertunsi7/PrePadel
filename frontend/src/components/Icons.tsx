import type { ReactNode } from 'react';
import { zoneLook } from '../lib/zones';

// Iconos dibujados a mano en SVG: mismo trazo redondeado en toda la app y sin
// depender de cómo pinte los emojis cada móvil.

function Icon({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type IconProps = { size?: number };

export const TodayIcon = ({ size }: IconProps) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </Icon>
);

export const ProgramsIcon = ({ size }: IconProps) => (
  <Icon size={size}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="4" />
    <path d="M8 3v4M16 3v4M3.5 10.5h17" />
    <path d="M8.5 15.2l2.3 2.3 4.7-4.6" />
  </Icon>
);

export const PainIcon = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M12 20.5C5.5 16 3 12.6 3 9.2 3 6.5 5.1 4.5 7.6 4.5c1.8 0 3.4 1 4.4 2.6 1-1.6 2.6-2.6 4.4-2.6 2.5 0 4.6 2 4.6 4.7 0 3.4-2.5 6.8-9 11.3z" />
    <path d="M6.5 12h3l1.5-2.6 2 5 1.5-2.4h3" strokeWidth="2" />
  </Icon>
);

export const ProfileIcon = ({ size }: IconProps) => (
  <Icon size={size}>
    <circle cx="12" cy="8" r="4.2" />
    <path d="M4 20.5c1.2-3.6 4.3-5.5 8-5.5s6.8 1.9 8 5.5" />
  </Icon>
);

export const PlayIcon = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z" fill="currentColor" />
  </Icon>
);

export const PauseIcon = ({ size }: IconProps) => (
  <Icon size={size}>
    <rect x="5.5" y="4.5" width="4.5" height="15" rx="1.6" fill="currentColor" />
    <rect x="14" y="4.5" width="4.5" height="15" rx="1.6" fill="currentColor" />
  </Icon>
);

export const NextIcon = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M5 5.5v13l10-6.5z" fill="currentColor" />
    <path d="M19 5v14" />
  </Icon>
);

export const PreviousIcon = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M19 5.5v13L9 12z" fill="currentColor" />
    <path d="M5 5v14" />
  </Icon>
);

export const CloseIcon = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const BackIcon = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M14.5 5.5L8 12l6.5 6.5" />
  </Icon>
);

export const ChevronIcon = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M9.5 5.5L16 12l-6.5 6.5" />
  </Icon>
);

export const CheckIcon = ({ size }: IconProps) => (
  <Icon size={size}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const SoundIcon = ({ size, off = false }: IconProps & { off?: boolean }) => (
  <Icon size={size}>
    <path d="M4 9.5v5h3.5l5 4v-13l-5 4z" fill="currentColor" />
    {off ? <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" /> : <path d="M16.5 8.5c1.3 1 2 2.2 2 3.5s-.7 2.5-2 3.5" />}
  </Icon>
);

export const ClockIcon = ({ size }: IconProps) => (
  <Icon size={size}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

/** Articulación de cada zona sobre un círculo de su color. */
export function ZoneIcon({ zone, size = 48 }: { zone: string | null; size?: number }) {
  const look = zoneLook(zone);
  return (
    <span className="zone-icon" style={{ width: size, height: size, background: look.soft }} aria-hidden="true">
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {jointGlyph(zone, look.strong)}
      </svg>
    </span>
  );
}

function jointGlyph(zone: string | null, strong: string): ReactNode {
  switch (zone) {
    case 'ELBOW':
      return (
        <>
          <path d="M7 5l7 15 13-4" />
          <circle cx="14" cy="20" r="3.6" fill={strong} stroke="none" />
        </>
      );
    case 'SHOULDER':
      return (
        <>
          <path d="M4 23c0-9 6-15 15-15" />
          <path d="M19 8l7 17" />
          <circle cx="19" cy="8" r="3.6" fill={strong} stroke="none" />
        </>
      );
    case 'KNEE':
      return (
        <>
          <path d="M11 3l8 12-7 14" />
          <circle cx="19" cy="15" r="3.6" fill={strong} stroke="none" />
        </>
      );
    default:
      // Rutinas generales: una pelota.
      return (
        <>
          <circle cx="16" cy="16" r="11" />
          <path d="M8.5 9c3.5 3.5 3.5 10.5 0 14M23.5 9c-3.5 3.5-3.5 10.5 0 14" stroke={strong} strokeWidth="2.6" />
        </>
      );
  }
}
