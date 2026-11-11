import { useId } from 'react';

export type Mood = 'happy' | 'cheer' | 'calm' | 'worried';

const INK = '#22304a';

/** Bola, la pelota de pádel con cinta que acompaña al jugador por toda la app. */
export function Mascot({ mood = 'happy', size = 96 }: { mood?: Mood; size?: number }) {
  const clip = useId();
  return (
    <svg className="mascot" width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <circle cx="60" cy="58" r="44" />
        </clipPath>
      </defs>
      <ellipse cx="60" cy="111" rx="28" ry="5" fill={INK} opacity="0.14" />
      <circle cx="60" cy="58" r="44" fill="#d8f24a" />
      <g clipPath={`url(#${clip})`}>
        {/* costuras de la pelota */}
        <path d="M14 30 C 34 46, 34 72, 16 90" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
        <path d="M106 30 C 86 46, 86 72, 104 90" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
        {/* cinta del pelo */}
        <path d="M10 40 Q 60 14 110 40 L 110 52 Q 60 27 10 52 Z" fill="#ff6b5b" stroke={INK} strokeWidth="3.5" />
      </g>
      <circle cx="60" cy="58" r="44" fill="none" stroke={INK} strokeWidth="4" />
      <circle cx="38" cy="76" r="6" fill="#ff9d8a" opacity="0.75" />
      <circle cx="82" cy="76" r="6" fill="#ff9d8a" opacity="0.75" />
      <Face mood={mood} />
    </svg>
  );
}

function Face({ mood }: { mood: Mood }) {
  const stroke = { fill: 'none', stroke: INK, strokeWidth: 4, strokeLinecap: 'round' as const };
  switch (mood) {
    case 'cheer':
      return (
        <>
          <path d="M40 66 Q 46 58 52 66" {...stroke} />
          <path d="M68 66 Q 74 58 80 66" {...stroke} />
          <path d="M48 78 Q 60 96 72 78 Z" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        </>
      );
    case 'calm':
      return (
        <>
          <path d="M40 64 Q 46 70 52 64" {...stroke} />
          <path d="M68 64 Q 74 70 80 64" {...stroke} />
          <path d="M53 80 Q 60 85 67 80" {...stroke} />
        </>
      );
    case 'worried':
      return (
        <>
          <path d="M39 56 L 51 60" {...stroke} strokeWidth={3.5} />
          <path d="M81 56 L 69 60" {...stroke} strokeWidth={3.5} />
          <ellipse cx="46" cy="68" rx="4.5" ry="5.5" fill={INK} />
          <ellipse cx="74" cy="68" rx="4.5" ry="5.5" fill={INK} />
          <path d="M52 86 Q 60 79 68 86" {...stroke} />
        </>
      );
    case 'happy':
      return (
        <>
          <ellipse cx="46" cy="66" rx="5" ry="6.5" fill={INK} />
          <ellipse cx="74" cy="66" rx="5" ry="6.5" fill={INK} />
          <circle cx="47.5" cy="63.5" r="1.8" fill="#fff" />
          <circle cx="75.5" cy="63.5" r="1.8" fill="#fff" />
          <path d="M50 79 Q 60 89 70 79" {...stroke} />
        </>
      );
  }
}
