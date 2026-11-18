import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AlertCard, ProgramPaused, SessionDots } from '../components/Bits';
import { CheckIcon, ChevronIcon, ClockIcon, PainIcon, PlayIcon, ZoneIcon } from '../components/Icons';
import { ProgramEnd, ProgramEndActions } from '../components/ProgramEnd';
import { completedToday, formatMinutes, formatTime, pausingAlert, sameDay, streakDays } from '../lib/derive';
import { useNow } from '../lib/hooks';
import { MAX_MATCHES, matchMoment, nextOccurrence, pushSubscription, reminderTime } from '../lib/reminder';
import { useAppState, useStore, type Match } from '../lib/store';
import { programSummary } from '../lib/summary';
import type { Content, PlayerState, Routine } from '../lib/types';
import { zoneVars } from '../lib/zones';

/** Pantalla principal: la rutina del día. */
export function Home() {
  const { content, me, outbox, offline } = useAppState();
  const now = useNow(60_000);
  if (!content || !me) {
    return null;
  }

  const doneToday = completedToday(me.recentCompletions, now);
  const streak = streakDays(me.recentCompletions, now);
  const warmup = content.routines.find((routine) => routine.kind === 'WARMUP');
  const recovery = content.routines.find((routine) => routine.kind === 'RECOVERY');

  return (
    <>
      <header className="hello">
        <div className="hello__top">
          <span className="eyebrow">{dateLabel(now)}</span>
          {streak >= 2 && <span className="chip chip--sun">{streak} días seguidos</span>}
        </div>
        <h1>{greeting(now)}</h1>
      </header>

      {me.alerts.map((alert) => (
        <AlertCard key={`${alert.zone}-${alert.kind}`} alert={alert} />
      ))}

      <MatchCard now={now} warmup={warmup} warmupDone={warmup !== undefined && doneToday.has(warmup.slug)} />

      <h2 className="section-title">Tu día de pádel</h2>
      {warmup && <RoutineCard routine={warmup} eyebrow="Antes del partido" done={doneToday.has(warmup.slug)} />}
      <ProgramToday content={content} me={me} doneToday={doneToday} />
      {recovery && (
        <RoutineCard routine={recovery} eyebrow="Después del partido" done={doneToday.has(recovery.slug)} />
      )}

      <Link to="/dolor" className="card card--link row">
        <span className="zone-icon zone-icon--pain" aria-hidden="true">
          <PainIcon />
        </span>
        <div className="row__text">
          <strong>¿Cómo ha quedado el cuerpo?</strong>
          <span className="muted">Registra el dolor con un toque</span>
        </div>
        <ChevronIcon />
      </Link>

      {offline && outbox.length > 0 && (
        <p className="sync-note" role="status">
          Sin conexión: {outbox.length === 1 ? '1 cambio guardado' : `${outbox.length} cambios guardados`} en el móvil.
          Se enviará solo al recuperar cobertura.
        </p>
      )}
    </>
  );
}

function RoutineCard({ routine, eyebrow, done }: { routine: Routine; eyebrow: string; done: boolean }) {
  return (
    <Link to={`/rutina/${routine.slug}`} className="card card--link row" style={zoneVars(routine.zone)}>
      <ZoneIcon zone={routine.zone} />
      <div className="row__text">
        <span className="eyebrow">{eyebrow}</span>
        <strong>{routine.name}</strong>
        <span className="muted">
          {formatMinutes(routine.totalSeconds)} · {routine.steps.length} ejercicios
        </span>
      </div>
      {done ? (
        <span className="chip chip--done">
          <CheckIcon size={16} /> Hecho
        </span>
      ) : (
        <ChevronIcon />
      )}
    </Link>
  );
}

/** La sesión del programa activo o, si no hay ninguno, el programa recomendado. */
function ProgramToday({ content, me, doneToday }: { content: Content; me: PlayerState; doneToday: Set<string> }) {
  const store = useStore();
  const enrollment = me.enrollment;
  const program = enrollment && content.programs.find((candidate) => candidate.slug === enrollment.programSlug);
  const session = enrollment && content.routines.find((routine) => routine.slug === enrollment.routineSlug);

  if (!enrollment || !program || !session) {
    const recommended = content.programs.find((candidate) => candidate.slug === me.recommendedProgram);
    return (
      <Link
        to={recommended ? `/programas/${recommended.slug}` : '/programas'}
        className="card card--link row"
        style={zoneVars(recommended?.zone)}
      >
        <ZoneIcon zone={recommended?.zone ?? null} />
        <div className="row__text">
          <span className="eyebrow">{recommended ? 'Recomendado para ti' : 'Programas de 4 semanas'}</span>
          <strong>{recommended ? recommended.name : 'Elige la zona que quieres reforzar'}</strong>
          <span className="muted">4 semanas · 3 sesiones cortas por semana</span>
        </div>
        <ChevronIcon />
      </Link>
    );
  }

  const week = program.weeks.find((candidate) => candidate.week === enrollment.currentWeek);
  const sessionDoneToday = program.weeks.some((candidate) => doneToday.has(candidate.routineSlug));
  const summary = programSummary(me, program);

  return (
    <section className="card card--zone program-today" style={zoneVars(program.zone)}>
      <Link to={`/programas/${program.slug}`} className="row row--flush">
        <ZoneIcon zone={program.zone} />
        <div className="row__text">
          <span className="eyebrow">Tu programa</span>
          <strong>{program.name}</strong>
          <span className="muted">
            Semana {enrollment.currentWeek} de {enrollment.totalWeeks}
            {week ? ` · ${week.title}` : ''}
          </span>
        </div>
        <SessionDots done={enrollment.sessionsDoneThisWeek} total={enrollment.sessionsPerWeek} />
      </Link>
      {summary ? (
        <>
          <ProgramEnd summary={summary} zone={program.zone} content={content} />
          <ProgramEndActions onRepeat={() => store.enroll(program.slug)} />
        </>
      ) : pausingAlert(me.alerts, program.zone) ? (
        <ProgramPaused />
      ) : sessionDoneToday ? (
        <p className="done-note">
          <CheckIcon size={18} /> Sesión de hoy hecha. Mañana más.
        </p>
      ) : (
        <Link to={`/rutina/${session.slug}`} className="btn btn--primary btn--block">
          Empezar sesión · {formatMinutes(session.totalSeconds)}
        </Link>
      )}
    </section>
  );
}

/**
 * Recordatorio ligado al partido: aviso 30 minutos antes de cada partido que marca el jugador.
 * Si se juega hoy y aún no ha calentado, el calentamiento es la acción principal de la tarjeta.
 */
function MatchCard({ now, warmup, warmupDone }: { now: Date; warmup?: Routine; warmupDone: boolean }) {
  const store = useStore();
  const { matches } = useAppState();
  const [adding, setAdding] = useState(false);

  // Partidos que ya quedan atrás: el semanal pasa a la semana que viene; el suelto se quita.
  useEffect(() => {
    store.settleMatches(now);
  }, [matches, now, store]);

  const played = matches.filter((match) => matchMoment(new Date(match.at), now) === 'after');
  const upcoming = matches.filter((match) => matchMoment(new Date(match.at), now) === 'before');
  const full = matches.length >= MAX_MATCHES;
  const title = upcoming.length === 1 ? 'Tu partido' : 'Tus partidos';
  const playsToday = upcoming.some((match) => sameDay(new Date(match.at), now));

  return (
    <>
      {played.map((match) => (
        <PlayedMatch key={match.id} match={match} />
      ))}

      {upcoming.length > 0 && (
        <section className="card match match--set" aria-label={title}>
          <div className="row row--flush">
            <span className="zone-icon zone-icon--sun" aria-hidden="true">
              <ClockIcon />
            </span>
            <div className="row__text">
              <span className="eyebrow">{title}</span>
              <strong>Aviso para calentar 30 min antes</strong>
              <span className="muted">
                {upcoming.every((match) => match.remote)
                  ? 'Te llegará aunque cierres la app.'
                  : canNotify()
                    ? 'Deja PrePádel abierta para que llegue el aviso.'
                    : 'Activa las notificaciones del navegador para recibir el aviso.'}
              </span>
            </div>
          </div>
          <ul className="match__list">
            {upcoming.map((match) => {
              const at = new Date(match.at);
              const when = `${dayLabel(at, now)} a las ${formatTime(at)}`;
              // "de hoy", "de mañana" o "del martes".
              const ofWhen = when.startsWith('el ') ? `del ${when.slice(3)}` : `de ${when}`;
              return (
                <li key={match.id} className="match__item">
                  <div className="row__text">
                    <strong>{capitalize(when)}</strong>
                    <span className="muted">
                      Aviso a las {formatTime(reminderTime(at))}
                      {match.weekly && ' · cada semana'}
                    </span>
                  </div>
                  <button
                    className="link-btn"
                    aria-label={`Quitar el partido ${ofWhen}`}
                    onClick={() => store.removeMatch(match.id)}
                  >
                    Quitar
                  </button>
                </li>
              );
            })}
          </ul>
          {playsToday && warmup && !warmupDone && (
            <Link to={`/rutina/${warmup.slug}`} className="btn btn--primary btn--block">
              <PlayIcon /> Calentar · {formatMinutes(warmup.totalSeconds)}
            </Link>
          )}
          {full ? (
            <span className="muted small">Como mucho {MAX_MATCHES} partidos: quita uno para añadir otro.</span>
          ) : (
            !adding && (
              <button className="link-btn" onClick={() => setAdding(true)}>
                Añadir otro partido
              </button>
            )
          )}
        </section>
      )}

      {!full && (adding || matches.length === 0) && (
        <MatchForm now={now} onDone={() => setAdding(false)} cancelable={matches.length > 0} />
      )}
    </>
  );
}

/** Partido recién jugado: toca recuperar y registrar cómo ha quedado el cuerpo. */
function PlayedMatch({ match }: { match: Match }) {
  const store = useStore();
  const label = `Partido de las ${formatTime(new Date(match.at))}`;
  return (
    <section className="card match match--set" aria-label={label}>
      <div className="row__text">
        <span className="eyebrow">{label}</span>
        <strong>¿Qué tal ha ido? Toca recuperar</strong>
      </div>
      <div className="match__row">
        <Link className="btn btn--secondary" to="/dolor">
          Registrar dolor
        </Link>
        <button className="link-btn" onClick={() => store.finishMatch(match.id)}>
          Listo
        </button>
      </div>
    </section>
  );
}

/** Partido nuevo: día (de hoy a seis días vista), hora y si se repite cada semana. */
function MatchForm({ now, onDone, cancelable }: { now: Date; onDone: () => void; cancelable: boolean }) {
  const store = useStore();
  const { content } = useAppState();
  const [day, setDay] = useState(0);
  const [time, setTime] = useState('');
  const [weekly, setWeekly] = useState(false);

  return (
    <form
      className="card match"
      aria-label="Nuevo partido"
      onSubmit={(event) => {
        event.preventDefault();
        if (!time) {
          return;
        }
        const id = store.addMatch(nextOccurrence(time, new Date(), day, weekly).toISOString(), weekly);
        onDone();
        if (!id) {
          return;
        }
        // Pide permiso y, si el móvil lo admite, deja el aviso también en el servidor (app cerrada).
        void pushSubscription(content?.pushPublicKey).then((subscription) => {
          if (subscription) {
            store.remindWhenClosed(id, subscription);
          }
        });
      }}
    >
      <div className="row__text">
        <span className="eyebrow">¿Cuándo juegas?</span>
        <strong>Te aviso 30 min antes para calentar</strong>
      </div>
      <div className="match__row">
        <select
          className="input"
          aria-label="Día del partido"
          value={day}
          onChange={(event) => setDay(Number(event.target.value))}
        >
          {dayChoices(now).map((label, offset) => (
            <option key={offset} value={offset}>
              {label}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="time"
          aria-label="Hora del partido"
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
      </div>
      <label className="check">
        <input type="checkbox" checked={weekly} onChange={(event) => setWeekly(event.target.checked)} />
        Juego todas las semanas ese día a esa hora
      </label>
      <div className="match__row">
        <button className="btn btn--secondary" type="submit" disabled={!time}>
          Avisarme
        </button>
        {cancelable && (
          <button className="link-btn" type="button" onClick={onDone}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

/** Hoy y los seis días siguientes, para elegir el del partido: "Hoy", "Mañana", "Lunes"... */
function dayChoices(now: Date): string[] {
  return Array.from({ length: 7 }, (_, offset) => {
    if (offset < 2) {
      return offset === 0 ? 'Hoy' : 'Mañana';
    }
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return capitalize(date.toLocaleDateString('es-ES', { weekday: 'long' }));
  });
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "hoy", "mañana" o "el martes". */
function dayLabel(match: Date, now: Date): string {
  if (sameDay(match, now)) {
    return 'hoy';
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(match, tomorrow)) {
    return 'mañana';
  }
  return 'el ' + match.toLocaleDateString('es-ES', { weekday: 'long' });
}

function canNotify(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 6) {
    return 'Buenas noches';
  }
  if (hour < 13) {
    return 'Buenos días';
  }
  return hour < 21 ? 'Buenas tardes' : 'Buenas noches';
}

function dateLabel(now: Date): string {
  const label = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
