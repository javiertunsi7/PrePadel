import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { SessionDots } from '../components/Bits';
import { BackIcon, CheckIcon, ZoneIcon } from '../components/Icons';
import { completedToday, formatMinutes, formatSeconds } from '../lib/derive';
import { useAppState, useStore } from '../lib/store';
import { zoneVars } from '../lib/zones';

/** Un programa: sus cuatro semanas, qué se hace en cada una y por dónde va el jugador. */
export function ProgramDetail() {
  const { slug } = useParams();
  const store = useStore();
  const { content, me } = useAppState();
  const [confirmingSwitch, setConfirmingSwitch] = useState(false);

  if (!content || !me) {
    return null;
  }
  const program = content.programs.find((candidate) => candidate.slug === slug);
  if (!program) {
    return <Navigate to="/programas" replace />;
  }

  const zone = content.zones.find((candidate) => candidate.code === program.zone);
  const routines = new Map(content.routines.map((routine) => [routine.slug, routine]));
  const equipment = [...new Set(program.weeks.flatMap((week) => routines.get(week.routineSlug)?.equipment ?? []))];
  const longest = Math.max(...program.weeks.map((week) => routines.get(week.routineSlug)?.totalSeconds ?? 0));

  const enrollment = me.enrollment;
  const active = enrollment?.programSlug === program.slug ? enrollment : null;
  const otherProgram =
    enrollment && !active && !enrollment.completed
      ? content.programs.find((candidate) => candidate.slug === enrollment.programSlug)
      : undefined;
  const doneToday = completedToday(me.recentCompletions, new Date());
  const sessionDoneToday = program.weeks.some((week) => doneToday.has(week.routineSlug));

  const startProgram = () => {
    store.enroll(program.slug);
    setConfirmingSwitch(false);
  };

  return (
    <div className="detail" style={zoneVars(program.zone)}>
      <Link to="/programas" className="back-link">
        <BackIcon size={20} /> Programas
      </Link>
      <header className="detail__hero">
        <ZoneIcon zone={program.zone} size={72} />
        <span className="eyebrow">
          {zone?.name ?? program.zone} · {program.weeks.length} semanas
        </span>
        <h1>{program.name}</h1>
        <p className="lead">{program.summary}</p>
        <div className="chips chips--center">
          <span className="chip">{program.sessionsPerWeek} sesiones por semana</span>
          <span className="chip">Hasta {formatMinutes(longest)}</span>
        </div>
      </header>

      {equipment.length > 0 && (
        <p className="note">
          <strong>Material:</strong> {equipment.join(' · ')}
        </p>
      )}

      <h2 className="section-title">Semana a semana</h2>
      <ol className="plain-list">
        {program.weeks.map((week) => {
          const routine = routines.get(week.routineSlug);
          const isDone = active !== null && (active.completed || week.week < active.currentWeek);
          const isCurrent = active !== null && !active.completed && week.week === active.currentWeek;
          return (
            <li key={week.week} className={isCurrent ? 'card week week--current' : 'card week'}>
              <details open={isCurrent}>
                <summary className="row row--flush">
                  <span className={isDone ? 'week__number week__number--done' : 'week__number'}>
                    {isDone ? <CheckIcon size={18} /> : week.week}
                  </span>
                  <span className="row__text">
                    <strong>{week.title}</strong>
                    <span className="muted">{week.focus}</span>
                  </span>
                  {isCurrent && <SessionDots done={active.sessionsDoneThisWeek} total={active.sessionsPerWeek} />}
                </summary>
                {routine && (
                  <ul className="steps steps--compact">
                    {routine.steps.map((step) => (
                      <li key={step.order}>
                        <span>{step.name}</span>
                        <span className="muted">{formatSeconds(step.durationSeconds)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </li>
          );
        })}
      </ol>

      <div className="sticky-cta">
        {active && !active.completed ? (
          sessionDoneToday ? (
            <p className="done-note">
              <CheckIcon size={18} /> Sesión de hoy hecha. Mañana más.
            </p>
          ) : (
            <Link className="btn btn--primary btn--block" to={`/rutina/${active.routineSlug}`}>
              Empezar sesión · semana {active.currentWeek}
            </Link>
          )
        ) : active ? (
          <>
            <p className="done-note">¡Programa completado!</p>
            <button className="btn btn--secondary btn--block" onClick={startProgram}>
              Repetir programa
            </button>
          </>
        ) : otherProgram && confirmingSwitch ? (
          <div className="confirm">
            <p>Dejarás «{otherProgram.name}». Si vuelves a él, empezará desde la semana 1.</p>
            <button className="btn btn--primary btn--block" onClick={startProgram}>
              Sí, cambiar de programa
            </button>
            <button className="btn btn--ghost btn--block" onClick={() => setConfirmingSwitch(false)}>
              Seguir con el actual
            </button>
          </div>
        ) : otherProgram ? (
          <button className="btn btn--primary btn--block" onClick={() => setConfirmingSwitch(true)}>
            Cambiar a este programa
          </button>
        ) : (
          <button className="btn btn--primary btn--block" onClick={startProgram}>
            Empezar este programa
          </button>
        )}
      </div>
    </div>
  );
}
