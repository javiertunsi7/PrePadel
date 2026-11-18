import { Link } from 'react-router';
import { PROGRAM_PAUSED } from '../lib/copy';
import { RISK_LABEL } from '../lib/zones';
import type { PainAlert, RiskLevel } from '../lib/types';
import { WarningIcon } from './Icons';

/** Aviso de "para y consulta a un profesional". */
export function AlertCard({ alert }: { alert: PainAlert }) {
  return (
    <div className="alert" role="alert">
      <span className="alert__icon" aria-hidden="true">
        <WarningIcon />
      </span>
      <p>{alert.message}</p>
    </div>
  );
}

/** En lugar de "Empezar sesión" mientras el dolor de la zona pida parar y consultar. */
export function ProgramPaused() {
  return (
    <div className="paused">
      <p>
        <strong>Programa en pausa.</strong> {PROGRAM_PAUSED}
      </p>
      <Link to="/dolor" className="btn btn--secondary btn--block">
        Registrar dolor
      </Link>
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
