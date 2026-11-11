import type { CSSProperties } from 'react';
import { painColor, painWord } from '../lib/copy';

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Escala de dolor de 0 a 10: un toque y queda registrado. */
export function PainScale({
  value,
  onSelect,
  label,
}: {
  value: number | null;
  onSelect: (score: number) => void;
  label: string;
}) {
  return (
    <div className="pain-scale" role="radiogroup" aria-label={label}>
      {SCORES.map((score) => (
        <button
          key={score}
          type="button"
          role="radio"
          aria-checked={value === score}
          aria-label={`${score} de 10, ${painWord(score).toLowerCase()}`}
          className="pain-dot"
          style={{ '--dot': painColor(score) } as CSSProperties}
          onClick={() => onSelect(score)}
        >
          {score}
        </button>
      ))}
    </div>
  );
}
