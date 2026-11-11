import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AlertCard, SessionDots } from '../components/Bits';
import { CheckIcon, ChevronIcon, ClockIcon, PainIcon, ZoneIcon } from '../components/Icons';
import { Mascot } from '../components/Mascot';
import { completedToday, formatMinutes, formatTime, sameDay, streakDays } from '../lib/derive';
import { useNow } from '../lib/hooks';
import { matchMoment, nextOccurrence, reminderTime } from '../lib/reminder';
import { useAppState, useStore } from '../lib/store';
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
  const mood = me.alerts.length > 0 ? 'worried' : doneToday.size > 0 ? 'cheer' : 'happy';

  return (
    <>
      <header className="hello">
        <Mascot mood={mood} size={84} />
        <div className="hello__text">
          <span className="eyebrow">{dateLabel(now)}</span>
          <h1>{greeting(now)}</h1>
        </div>
        {streak >= 2 && <span className="chip chip--sun">{streak} días seguidos</span>}
      </header>

      {me.alerts.map((alert) => (
        <AlertCard key={`${alert.zone}-${alert.kind}`} alert={alert} />
      ))}

      <MatchCard now={now} />

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
      {enrollment.completed ? (
        <p className="done-note">¡Programa completado! Puedes repetirlo o reforzar otra zona.</p>
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

/** Recordatorio ligado al partido: aviso 30 minutos antes de la hora que marca el jugador. */
function MatchCard({ now }: { now: Date }) {
  const store = useStore();
  const { matchAt } = useAppState();
  const [time, setTime] = useState('');
  const match = matchAt ? new Date(matchAt) : null;
  const moment = match ? matchMoment(match, now) : null;

  useEffect(() => {
    if (moment === 'over') {
      store.setMatch(null);
    }
  }, [moment, store]);

  if (!match || moment === 'over') {
    return (
      <form
        className="card match"
        onSubmit={(event) => {
          event.preventDefault();
          if (!time) {
            return;
          }
          if ('Notification' in window && Notification.permission === 'default') {
            void Notification.requestPermission();
          }
          store.setMatch(nextOccurrence(time, new Date()).toISOString());
        }}
      >
        <label htmlFor="match-time" className="row__text">
          <span className="eyebrow">¿A qué hora juegas?</span>
          <strong>Te aviso 30 min antes para calentar</strong>
        </label>
        <div className="match__row">
          <input
            id="match-time"
            className="input"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
          <button className="btn btn--secondary" type="submit" disabled={!time}>
            Avisarme
          </button>
        </div>
      </form>
    );
  }

  if (moment === 'before') {
    return (
      <section className="card match match--set">
        <div className="row row--flush">
          <span className="zone-icon zone-icon--sun" aria-hidden="true">
            <ClockIcon />
          </span>
          <div className="row__text">
            <span className="eyebrow">
              Partido {sameDay(match, now) ? 'hoy' : 'mañana'} a las {formatTime(match)}
            </span>
            <strong>Aviso para calentar a las {formatTime(reminderTime(match))}</strong>
            <span className="muted">
              {canNotify()
                ? 'Deja PrePádel abierta para que llegue el aviso.'
                : 'Activa las notificaciones del navegador para recibir el aviso.'}
            </span>
          </div>
        </div>
        <button className="link-btn" onClick={() => store.setMatch(null)}>
          Quitar aviso
        </button>
      </section>
    );
  }

  return (
    <section className="card match match--set">
      <div className="row__text">
        <span className="eyebrow">Partido de las {formatTime(match)}</span>
        <strong>¿Qué tal ha ido? Toca recuperar</strong>
      </div>
      <div className="match__row">
        <Link className="btn btn--secondary" to="/dolor">
          Registrar dolor
        </Link>
        <button className="link-btn" onClick={() => store.setMatch(null)}>
          Listo
        </button>
      </div>
    </section>
  );
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
