const LIME = '#d7ff3a';
const NIGHT = '#0b1f3a';

/**
 * La bola de PrePádel: pelota lima con las costuras en azul noche. Acompaña al
 * jugador en la bienvenida y al terminar una rutina. `moving` le añade rayas de
 * velocidad a la izquierda.
 */
export function Ball({ size = 96, moving = false }: { size?: number; moving?: boolean }) {
  return (
    <svg
      className="ball"
      width={moving ? size * 1.6 : size}
      height={size}
      viewBox={moving ? '-72 0 192 120' : '0 0 120 120'}
      aria-hidden="true"
    >
      {moving && (
        <g stroke={LIME} strokeWidth="6" strokeLinecap="round" opacity="0.55">
          <path d="M-64 40H-14" />
          <path d="M-50 62H-6" />
          <path d="M-60 84H-16" />
        </g>
      )}
      <circle cx="60" cy="60" r="56" fill={LIME} />
      <path d="M24 24C48 45 48 75 24 96" fill="none" stroke={NIGHT} strokeWidth="7" strokeLinecap="round" />
      <path d="M96 24C72 45 72 75 96 96" fill="none" stroke={NIGHT} strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
