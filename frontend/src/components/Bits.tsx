import { RISK_LABEL } from '../lib/zones';
import type { PainAlert, RiskLevel } from '../lib/types';
import { Mascot } from './Mascot';

/** Aviso de "para y consulta a un profesional". */
export function AlertCard({ alert }: { alert: PainAlert }) {
  return (
    <div className="alert" role="alert">
      <Mascot mood="worried" size={56} />
      <p>{alert.message}</p>
    </div>
  );
}

export function RiskChip({ level }: { level: RiskLevel }) {
  return <span className={`chip chip--risk-${level.toLowerCase()}`}>{RISK_LABEL[level]}</span>;
}

/** Sesiones hechas esta semana, como puntos. */
export function SessionDots({ done, total }: { done: number; total: number }) {
  return (
    <span className="dots" role="img" aria-label={`${done} de ${total} sesiones esta semana`}>
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={index < done ? 'dot dot--done' : 'dot'} />
      ))}
    </span>
  );
}
