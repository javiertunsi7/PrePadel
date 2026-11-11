import type { ReactNode } from 'react';

const RADIUS = 45;
const LENGTH = 2 * Math.PI * RADIUS;

/** Anillo de cuenta atrás: se va llenando según avanza la fase. */
export function Ring({ progress, children }: { progress: number; children: ReactNode }) {
  const filled = Math.min(1, Math.max(0, progress));
  return (
    <div className="ring">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring__track" cx="50" cy="50" r={RADIUS} />
        <circle
          className="ring__bar"
          cx="50"
          cy="50"
          r={RADIUS}
          strokeDasharray={LENGTH}
          strokeDashoffset={LENGTH * (1 - filled)}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="ring__content">{children}</div>
    </div>
  );
}
