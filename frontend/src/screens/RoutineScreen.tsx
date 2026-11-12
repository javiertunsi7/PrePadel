import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { SessionDots } from '../components/Bits';
import { ExerciseMedia, ExerciseSheet, ExerciseThumb, hasMedia } from '../components/ExerciseSheet';
import {
  BackIcon,
  CheckIcon,
  CloseIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  SoundIcon,
  ZoneIcon,
} from '../components/Icons';
import { Mascot } from '../components/Mascot';
import { PainScale } from '../components/PainScale';
import { Ring } from '../components/Ring';
import { DISCLAIMER, KIND_LABEL } from '../lib/copy';
import { formatClock, formatMinutes, formatSeconds } from '../lib/derive';
import { useScrollToTop, useWakeLock } from '../lib/hooks';
import {
  advance,
  back,
  cuesBetween,
  phaseProgress,
  shownStep,
  skip,
  start,
  togglePause,
  type Playback,
} from '../lib/player';
import { useAppState, useStore } from '../lib/store';
import type { Routine, Step } from '../lib/types';
import { beep, hush, say, unlockAudio } from '../lib/voice';
import { zoneVars } from '../lib/zones';

const TICK_MS = 200;
/** Si el móvil se bloquea o se cambia de app, ese tiempo no cuenta: la rutina sigue donde estaba. */
const MAX_TICK_MS = 1000;

/** Una rutina: resumen, reproductor a pantalla completa y pantalla final. */
export function RoutineScreen() {
  const { slug } = useParams();
  const { content } = useAppState();
  const routine = content?.routines.find((candidate) => candidate.slug === slug);
  if (!routine) {
    return <Navigate to="/" replace />;
  }
  return <RoutineRunner key={routine.slug} routine={routine} />;
}

function RoutineRunner({ routine }: { routine: Routine }) {
  const store = useStore();
  const { settings } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [leaving, setLeaving] = useState(false);
  const previous = useRef<Playback | null>(null);
  const saved = useRef(false);

  const running = playback !== null && !playback.paused && playback.phase !== 'done';
  useWakeLock(running);
  // Resumen, reproductor y pantalla final son vistas distintas: cada una empieza arriba.
  useScrollToTop(playback === null ? 'overview' : playback.phase === 'done' ? 'done' : 'playing');

  // Reloj: mide el tiempo real transcurrido para no acumular retraso.
  useEffect(() => {
    if (!running) {
      return;
    }
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min(now - last, MAX_TICK_MS);
      last = now;
      setPlayback((current) => (current ? advance(current, routine, elapsed) : current));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, routine]);

  // Manos libres: la voz anuncia cada ejercicio y los pitidos marcan el final.
  useEffect(() => {
    if (!playback) {
      return;
    }
    if (settings.voice) {
      for (const cue of cuesBetween(previous.current, playback, routine)) {
        if (cue.kind === 'say') {
          say(cue.text);
        } else {
          beep(cue.final);
        }
      }
    }
    previous.current = playback;
  }, [playback, routine, settings.voice]);

  // Al terminar se guarda una sola vez (funciona sin cobertura: queda en cola).
  useEffect(() => {
    if (playback?.phase === 'done' && !saved.current) {
      saved.current = true;
      store.completeRoutine(routine.slug);
    }
  }, [playback?.phase, routine.slug, store]);

  useEffect(() => hush, []);

  const goBack = () => {
    // Si se abrió la rutina directamente no hay "atrás": se va a inicio.
    if (location.key === 'default') {
      navigate('/', { replace: true });
    } else {
      navigate(-1);
    }
  };

  const toggleVoice = () => {
    if (settings.voice) {
      hush();
    }
    store.setVoice(!settings.voice);
  };

  if (!playback) {
    return (
      <Overview
        routine={routine}
        voice={settings.voice}
        onToggleVoice={toggleVoice}
        onBack={goBack}
        onStart={() => {
          unlockAudio();
          setPlayback(start());
        }}
      />
    );
  }

  if (playback.phase === 'done') {
    return <Done routine={routine} />;
  }

  const step = shownStep(playback, routine);
  const shownIndex = routine.steps.indexOf(step);
  const seconds = Math.ceil(playback.remainingMs / 1000);
  const label =
    playback.phase === 'ready'
      ? 'Prepárate'
      : playback.phase === 'rest'
        ? 'Descansa'
        : `Ejercicio ${playback.stepIndex + 1} de ${routine.steps.length}`;

  const withMedia = hasMedia(step);

  return (
    <main
      className={`player player--${playback.phase}${withMedia ? ' player--media' : ''}`}
      style={zoneVars(step.zone)}
    >
      <header className="player__top">
        <button
          className="icon-btn"
          aria-label="Salir de la rutina"
          onClick={() => {
            setPlayback((current) => (current && !current.paused ? togglePause(current) : current));
            setLeaving(true);
          }}
        >
          <CloseIcon />
        </button>
        <div className="player__steps" aria-hidden="true">
          {routine.steps.map((each, index) => (
            <span key={each.order} className={index < shownIndex ? 'on' : index === shownIndex ? 'now' : undefined} />
          ))}
        </div>
        <button
          className="icon-btn"
          aria-pressed={settings.voice}
          aria-label={settings.voice ? 'Quitar la voz' : 'Activar la voz'}
          onClick={toggleVoice}
        >
          <SoundIcon off={!settings.voice} />
        </button>
      </header>

      <p className="player__label">{playback.paused ? 'En pausa' : label}</p>

      {/* Cómo se hace: el vídeo si existe y, si no, la figura en movimiento. */}
      {withMedia && (
        <div className="player__media">
          <ExerciseMedia exercise={step} paused={playback.paused} />
        </div>
      )}

      <div className="player__info">
        {playback.phase !== 'work' && <span className="eyebrow">Siguiente</span>}
        <h1>{step.name}</h1>
        {step.dosage && <p className="player__dosage">{step.dosage}</p>}
        <p className="player__how">{step.instructions}</p>
      </div>

      <Ring progress={phaseProgress(playback, routine)}>
        <span className="player__seconds" role="timer" aria-label={`Quedan ${seconds} segundos`}>
          {formatClock(seconds)}
        </span>
      </Ring>

      <footer className="player__controls">
        <button
          className="ctrl"
          aria-label="Repetir el ejercicio o volver al anterior"
          onClick={() => setPlayback((current) => current && back(current, routine))}
        >
          <PreviousIcon size={28} />
        </button>
        <button
          className="ctrl ctrl--main"
          aria-label={playback.paused ? 'Continuar' : 'Pausar'}
          onClick={() => setPlayback((current) => current && togglePause(current))}
        >
          {playback.paused ? <PlayIcon size={40} /> : <PauseIcon size={40} />}
        </button>
        <button
          className="ctrl"
          aria-label="Saltar al siguiente ejercicio"
          onClick={() => setPlayback((current) => current && skip(current, routine))}
        >
          <NextIcon size={28} />
        </button>
      </footer>

      {leaving && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Salir de la rutina">
          <div className="card sheet__body">
            <h2>¿Salir de la rutina?</h2>
            <p>Si sales ahora, esta sesión no se guardará.</p>
            <button
              className="btn btn--primary btn--block"
              onClick={() => {
                setLeaving(false);
                setPlayback((current) => (current?.paused ? togglePause(current) : current));
              }}
            >
              Seguir con la rutina
            </button>
            <button
              className="btn btn--ghost btn--block"
              onClick={() => {
                // La cuenta atrás inicial todavía no es un ejercicio: ahí no se anota nada.
                if (playback.phase !== 'ready') {
                  store.abandonRoutine(routine.slug, routine.steps[playback.stepIndex].exerciseSlug);
                }
                goBack();
              }}
            >
              Salir
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Overview({
  routine,
  voice,
  onToggleVoice,
  onBack,
  onStart,
}: {
  routine: Routine;
  voice: boolean;
  onToggleVoice: () => void;
  onBack: () => void;
  onStart: () => void;
}) {
  const [opened, setOpened] = useState<Step | null>(null);

  return (
    <main className="screen detail" style={zoneVars(routine.zone)}>
      <button className="back-link" onClick={onBack}>
        <BackIcon size={20} /> Volver
      </button>
      <header className="detail__hero">
        <ZoneIcon zone={routine.zone} size={72} />
        <span className="eyebrow">{KIND_LABEL[routine.kind]}</span>
        <h1>{routine.name}</h1>
        <p className="lead">{routine.summary}</p>
        <div className="chips chips--center">
          <span className="chip">{formatMinutes(routine.totalSeconds)}</span>
          <span className="chip">{routine.steps.length} ejercicios</span>
        </div>
      </header>

      {routine.equipment.length > 0 && (
        <p className="note">
          <strong>Necesitas:</strong> {routine.equipment.join(' · ')}
        </p>
      )}

      <label className="card switch-row">
        <span className="row__text">
          <strong>Voz que te guía</strong>
          <span className="muted">Deja el móvil apoyado y sigue las indicaciones</span>
        </span>
        <input type="checkbox" role="switch" checked={voice} onChange={onToggleVoice} />
      </label>

      <ol className="card steps">
        {routine.steps.map((step) => (
          <li key={step.order}>
            <button className="step-row" onClick={() => setOpened(step)}>
              <ExerciseThumb exercise={step} fallback={step.order} />
              <span className="row__text">
                <strong>{step.name}</strong>
                {step.dosage && <span className="muted">{step.dosage}</span>}
              </span>
              <span className="muted">{formatSeconds(step.durationSeconds)}</span>
            </button>
          </li>
        ))}
      </ol>

      <p className="muted small">{DISCLAIMER} Si notas un dolor agudo, para.</p>

      <div className="sticky-cta">
        <button className="btn btn--primary btn--block btn--big" onClick={onStart}>
          <PlayIcon /> Empezar
        </button>
      </div>

      {opened && (
        <ExerciseSheet
          exercise={opened}
          dose={{ seconds: opened.durationSeconds, dosage: opened.dosage }}
          onClose={() => setOpened(null)}
        />
      )}
    </main>
  );
}

function Done({ routine }: { routine: Routine }) {
  const store = useStore();
  const { content, me } = useAppState();
  const [painLogged, setPainLogged] = useState<number | null>(null);

  const zone = content?.zones.find((candidate) => candidate.code === routine.zone);
  const enrollment = me?.enrollment ?? null;
  const program = enrollment && content?.programs.find((candidate) => candidate.slug === enrollment.programSlug);
  const partOfProgram = program?.weeks.some((week) => week.routineSlug === routine.slug) ?? false;

  return (
    <main className="screen screen--center done" style={zoneVars(routine.zone)}>
      <Mascot mood="cheer" size={150} />
      <h1>¡Rutina hecha!</h1>
      <p className="lead">
        {formatMinutes(routine.totalSeconds)} bien invertidos. Tu cuerpo te lo agradecerá en la pista.
      </p>

      {enrollment && program && partOfProgram && (
        <div className="card card--zone done__progress">
          <strong>{program.name}</strong>
          {enrollment.completed ? (
            <span>¡Programa completado!</span>
          ) : enrollment.sessionsDoneThisWeek === 0 && enrollment.currentWeek > 1 ? (
            <span>
              ¡Semana {enrollment.currentWeek - 1} completada! La próxima sesión ya es de la semana{' '}
              {enrollment.currentWeek}.
            </span>
          ) : (
            <>
              <span className="muted">
                Semana {enrollment.currentWeek} de {enrollment.totalWeeks}
              </span>
              <SessionDots done={enrollment.sessionsDoneThisWeek} total={enrollment.sessionsPerWeek} />
            </>
          )}
        </div>
      )}

      {zone ? (
        <section className="card pain-card">
          <header className="pain-card__head">
            <ZoneIcon zone={zone.code} />
            <h2>¿Alguna molestia?</h2>
            <span className="pain-card__value">{zone.name}</span>
          </header>
          <PainScale
            value={painLogged}
            label={`Dolor en ${zone.name}`}
            onSelect={(score) => {
              store.logPain(zone.code, score, 'CHECK_IN');
              setPainLogged(score);
            }}
          />
          {painLogged !== null && (
            <p className="done-note" role="status">
              <CheckIcon size={18} /> Guardado: {painLogged}/10
            </p>
          )}
        </section>
      ) : (
        routine.kind === 'RECOVERY' && (
          <Link to="/dolor" className="btn btn--secondary btn--block">
            Registrar cómo ha quedado el cuerpo
          </Link>
        )
      )}

      <Link to="/" className="btn btn--primary btn--block">
        Volver a inicio
      </Link>
    </main>
  );
}
