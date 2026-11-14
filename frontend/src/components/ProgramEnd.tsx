import { Link } from 'react-router';
import { painColor, painRuleText, reviewText } from '../lib/copy';
import { daysAgoLabel } from '../lib/derive';
import type { ProgramSummary } from '../lib/summary';
import type { Content, PainEntry } from '../lib/types';

/**
 * Cierre de un programa: lo que ha hecho el jugador y cómo ha ido su registro de dolor en la
 * zona. Son sus registros, no un resultado clínico; si faltan, se dice en vez de suponer.
 */
export function ProgramEnd({ summary, zone, content }: { summary: ProgramSummary; zone: string; content: Content }) {
  const now = new Date();
  const zoneName = content.zones.find((candidate) => candidate.code === zone)?.name ?? zone;
  const wentUp = summary.painChange !== null && summary.painChange > 0;

  return (
    <section className="summary" aria-label="Resumen del programa">
      <h2>¡Programa completado!</h2>
      <dl className="facts">
        <div>
          <dt>Sesiones</dt>
          <dd>{summary.sessions}</dd>
        </div>
        <div>
          <dt>Semanas</dt>
          <dd>{summary.weeks}</dd>
        </div>
        <div>
          <dt>Empezaste</dt>
          <dd>{shortDate(summary.startedAt)}</dd>
        </div>
      </dl>

      <h3>Tu registro de dolor · {zoneName}</h3>
      <dl className="summary__pain">
        <PainMark label="Antes de empezar" entry={summary.painBefore} now={now} />
        <PainMark label="Último registro" entry={summary.painLatest} now={now} />
      </dl>
      <p className="summary__trend">{trendText(summary)}</p>
      {wentUp && <p className="small">{painRuleText(content)}</p>}
      <p className="muted small">Son tus propios registros, no una valoración médica. {reviewText(content)}</p>
    </section>
  );
}

/** Las dos salidas al terminar: otra zona o el mismo programa desde la semana 1. */
export function ProgramEndActions({ onRepeat }: { onRepeat: () => void }) {
  return (
    <>
      <Link className="btn btn--primary btn--block" to="/programas">
        Elegir otra zona
      </Link>
      <button className="btn btn--secondary btn--block" onClick={onRepeat}>
        Repetir programa
      </button>
    </>
  );
}

function PainMark({ label, entry, now }: { label: string; entry: PainEntry | null; now: Date }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {entry ? (
          <>
            <span className="summary__score" style={{ background: painColor(entry.score) }}>
              {entry.score}/10
            </span>
            <span className="muted small">{daysAgoLabel(new Date(entry.recordedAt), now)}</span>
          </>
        ) : (
          <span className="muted">Sin registro</span>
        )}
      </dd>
    </div>
  );
}

function trendText({ painBefore, painLatest }: ProgramSummary): string {
  if (!painLatest) {
    return 'No hay registros suficientes para comparar. Registra el dolor después de jugar y lo verás aquí.';
  }
  if (!painBefore) {
    return 'No hay registros suficientes para comparar.';
  }
  if (painLatest.score < painBefore.score) {
    return `Ha bajado de ${painBefore.score} a ${painLatest.score}.`;
  }
  if (painLatest.score > painBefore.score) {
    return `Ha subido de ${painBefore.score} a ${painLatest.score}.`;
  }
  return `Igual que antes de empezar: ${painLatest.score}/10.`;
}

/** "1 oct" */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
