import { useState } from 'react';
import { AlertCard } from '../components/Bits';
import { CheckIcon, ZoneIcon } from '../components/Icons';
import { PainScale } from '../components/PainScale';
import { DISCLAIMER, painColor, painRuleText } from '../lib/copy';
import { daysAgoLabel, sameDay } from '../lib/derive';
import { useAppState, useStore } from '../lib/store';
import type { PainEntry } from '../lib/types';
import { zoneVars } from '../lib/zones';

/** Registro de dolor en un toque: escala de 0 a 10 por zona después de cada partido. */
export function Pain() {
  const store = useStore();
  const { content, me } = useAppState();
  const [savedZone, setSavedZone] = useState<string | null>(null);
  if (!content || !me) {
    return null;
  }
  const now = new Date();

  return (
    <>
      <h1>¿Cómo estás hoy?</h1>
      <p className="lead">Un toque por zona después de cada partido. 0 es nada y 10 es mucho dolor.</p>

      {me.alerts.map((alert) => (
        <AlertCard key={`${alert.zone}-${alert.kind}`} alert={alert} />
      ))}

      {content.zones.map((zone) => {
        const entries = me.pain.filter((entry) => entry.zone === zone.code);
        const latest = entries.at(0);
        const loggedToday = latest !== undefined && sameDay(new Date(latest.recordedAt), now);
        return (
          <section key={zone.code} className="card pain-card" style={zoneVars(zone.code)}>
            <header className="pain-card__head">
              <ZoneIcon zone={zone.code} />
              <h2>{zone.name}</h2>
              {savedZone === zone.code ? (
                <span className="chip chip--done" role="status">
                  <CheckIcon size={16} /> Guardado
                </span>
              ) : (
                latest && (
                  <span className="pain-card__value">
                    {latest.score}/10 · {daysAgoLabel(new Date(latest.recordedAt), now)}
                  </span>
                )
              )}
            </header>
            <PainScale
              value={loggedToday ? latest.score : null}
              label={`Dolor en ${zone.name}`}
              onSelect={(score) => {
                store.logPain(zone.code, score);
                setSavedZone(zone.code);
              }}
            />
            <PainHistory entries={entries} />
          </section>
        );
      })}

      <p className="note">{painRuleText(content)}</p>
      <p className="muted small">{DISCLAIMER}</p>
    </>
  );
}

/** Últimos registros de una zona, del más antiguo al más reciente. */
function PainHistory({ entries }: { entries: PainEntry[] }) {
  if (entries.length < 2) {
    return null;
  }
  const recent = entries.slice(0, 12).reverse();
  return (
    <div
      className="history"
      role="img"
      aria-label={`Evolución, del más antiguo al más reciente: ${recent.map((entry) => entry.score).join(', ')}`}
    >
      {recent.map((entry) => (
        <span
          key={entry.id}
          className="history__bar"
          style={{ height: `${12 + entry.score * 8.8}%`, background: painColor(entry.score) }}
        />
      ))}
    </div>
  );
}
