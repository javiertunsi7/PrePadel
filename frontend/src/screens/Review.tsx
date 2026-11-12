import { useState, type FormEvent, type ReactNode } from 'react';
import { ExerciseSheet, ExerciseThumb, type ExerciseInfo } from '../components/ExerciseSheet';
import { ApiError, reviewApi } from '../lib/api';
import { painRuleText } from '../lib/copy';
import { formatMinutes, formatSeconds } from '../lib/derive';
import { useAppState } from '../lib/store';
import type { Content, ReviewItemState, ReviewState, ReviewVerdict, Step } from '../lib/types';
import { zoneVars } from '../lib/zones';

const KIND: Record<string, string> = { WARMUP: 'Calentamiento', RECOVERY: 'Recuperación', PROGRAM: 'Programa' };

/**
 * Pantalla del fisioterapeuta: aprueba o pide cambios en cada ejercicio, rutina,
 * programa y regla. Cuando todo está aprobado y firmado, la app deja de decir
 * "borrador". La contraseña solo vive en esta pantalla mientras está abierta.
 */
export default function Review() {
  const { content } = useAppState();
  const [password, setPassword] = useState('');
  const [review, setReview] = useState<ReviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Toda llamada a la API pasa por aquí: guarda el estado nuevo o explica el error. */
  const run = async (call: () => Promise<ReviewState>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      setReview(await call());
      return true;
    } catch (caught) {
      setError(explain(caught));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!content) {
    return (
      <main className="screen screen--center">
        <h1>Revisión del contenido</h1>
        <p>Cargando el catálogo… Hace falta conexión.</p>
      </main>
    );
  }

  if (!review) {
    return (
      <main className="screen review">
        <h1>Revisión del contenido</h1>
        <p className="lead">Para el fisioterapeuta que valida los ejercicios, las rutinas y las reglas de PrePádel.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => reviewApi.view(password));
          }}
        >
          <label className="field">
            <span className="field__label">Contraseña de revisión</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn--primary btn--block" type="submit" disabled={!password || busy}>
            Entrar
          </button>
        </form>
      </main>
    );
  }

  const judge = (key: string, verdict: ReviewVerdict, comment: string | null) =>
    run(() => reviewApi.judge(password, key, verdict, comment));

  return (
    <ReviewBoard
      content={content}
      review={review}
      busy={busy}
      error={error}
      onSign={(name, credentials) => run(() => reviewApi.sign(password, name, credentials))}
      onJudge={judge}
    />
  );
}

function explain(caught: unknown): string {
  if (caught instanceof ApiError) {
    if (caught.status === 401) {
      return 'Contraseña incorrecta.';
    }
    if (caught.status === 404) {
      return 'La revisión no está activada en este servidor.';
    }
    return caught.message;
  }
  return 'No hay conexión con el servidor. Inténtalo de nuevo.';
}

function ReviewBoard({
  content,
  review,
  busy,
  error,
  onSign,
  onJudge,
}: {
  content: Content;
  review: ReviewState;
  busy: boolean;
  error: string | null;
  onSign: (name: string, credentials: string) => Promise<boolean>;
  onJudge: (key: string, verdict: ReviewVerdict, comment: string | null) => Promise<boolean>;
}) {
  const [hideApproved, setHideApproved] = useState(false);
  const [opened, setOpened] = useState<ExerciseInfo | null>(null);
  const byKey = new Map(review.items.map((item) => [item.key, item]));
  const exercises = uniqueExercises(content);
  const routineName = new Map(content.routines.map((routine) => [routine.slug, routine.name]));
  const zoneName = new Map(content.zones.map((zone) => [zone.code, zone.name]));

  const card = (key: string, title: string, body: ReactNode, zone: string | null = null) => {
    const item = byKey.get(key);
    if (!item || (hideApproved && item.state === 'APPROVED')) {
      return null;
    }
    return (
      <ReviewCard key={key} item={item} title={title} zone={zone} busy={busy} onJudge={onJudge}>
        {body}
      </ReviewCard>
    );
  };

  return (
    <main className="screen review">
      <h1>Revisión del contenido</h1>
      <p className="lead">
        <strong>
          {review.approved} de {review.total} aprobados.
        </strong>{' '}
        {review.status === 'REVIEWED'
          ? 'Todo está validado: la app ya no avisa de que es un borrador.'
          : 'Mientras quede algo sin aprobar o falte tu firma, la app sigue avisando de que el contenido es un borrador.'}
      </p>
      <progress className="review__progress" max={review.total} value={review.approved} />

      <SignatureForm review={review} busy={busy} onSign={onSign} />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <label className="check">
        <input type="checkbox" checked={hideApproved} onChange={(event) => setHideApproved(event.target.checked)} />
        Ocultar lo ya aprobado
      </label>

      <h2 className="section-title">Reglas</h2>
      {card('rule:pain', 'Regla de "para y consulta"', <p>{painRuleText(content)}</p>)}
      {card(
        'rule:risk',
        'Perfil de riesgo del cuestionario',
        <>
          <p>Cada zona suma puntos de 0 a 100. Es orientativo, para decidir qué zona trabajar primero:</p>
          <ul>
            {review.riskWeights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>,
      )}

      <h2 className="section-title">Ejercicios</h2>
      {exercises.map((exercise) =>
        card(
          `exercise:${exercise.exerciseSlug}`,
          exercise.name,
          <div className="review__exercise">
            <button
              className="review__thumb"
              aria-label={`Ver ${exercise.name} en movimiento`}
              onClick={() => setOpened(exercise)}
            >
              <ExerciseThumb exercise={exercise} fallback="Sin dibujo" />
            </button>
            <div>
              <p>{exercise.instructions}</p>
              <p className="note">
                <strong>Voz:</strong> «{exercise.voiceCue}»
              </p>
              <p className="note">
                {exercise.zone ? zoneName.get(exercise.zone) : 'General'}
                {exercise.equipment && ` · Necesita: ${exercise.equipment}`}
                {exercise.switchSides && ' · Cambia de lado a mitad'}
              </p>
            </div>
          </div>,
          exercise.zone,
        ),
      )}

      <h2 className="section-title">Rutinas</h2>
      {content.routines.map((routine) =>
        card(
          `routine:${routine.slug}`,
          routine.name,
          <>
            <p className="note">
              {KIND[routine.kind] ?? routine.kind} · {formatMinutes(routine.totalSeconds)} · {routine.summary}
            </p>
            <ol className="review__steps">
              {routine.steps.map((step) => (
                <li key={step.order}>
                  <strong>{step.name}</strong> · {formatSeconds(step.durationSeconds)}
                  {step.dosage && ` · ${step.dosage}`}
                  {step.restSeconds > 0 && ` · descanso ${formatSeconds(step.restSeconds)}`}
                </li>
              ))}
            </ol>
          </>,
          routine.zone,
        ),
      )}

      <h2 className="section-title">Programas de 4 semanas</h2>
      {content.programs.map((program) =>
        card(
          `program:${program.slug}`,
          program.name,
          <>
            <p className="note">
              {program.summary} · {program.sessionsPerWeek} sesiones por semana
            </p>
            <ol className="review__steps">
              {program.weeks.map((week) => (
                <li key={week.week}>
                  <strong>
                    Semana {week.week}: {week.title}
                  </strong>{' '}
                  · {week.focus} · Rutina: {routineName.get(week.routineSlug) ?? week.routineSlug}
                </li>
              ))}
            </ol>
          </>,
          program.zone,
        ),
      )}

      <p className="note">
        Los dibujos son esquemas orientativos. Si cambia uno después de aprobarlo, la aprobación no se pierde sola:
        avisa a quien mantiene la app.
      </p>

      {opened && <ExerciseSheet exercise={opened} onClose={() => setOpened(null)} />}
    </main>
  );
}

function SignatureForm({
  review,
  busy,
  onSign,
}: {
  review: ReviewState;
  busy: boolean;
  onSign: (name: string, credentials: string) => Promise<boolean>;
}) {
  const [name, setName] = useState(review.reviewerName ?? '');
  const [credentials, setCredentials] = useState(review.reviewerCredentials ?? '');
  const [saved, setSaved] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaved(await onSign(name, credentials));
  };
  return (
    <form className="card review__sign" onSubmit={(event) => void submit(event)}>
      <h2>Tu firma</h2>
      <p className="note">Aparece en la app como quien ha validado el contenido.</p>
      <label className="field">
        <span className="field__label">Nombre y apellidos</span>
        <input
          className="input"
          value={name}
          maxLength={120}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
        />
      </label>
      <label className="field">
        <span className="field__label">Titulación y nº de colegiado</span>
        <input
          className="input"
          value={credentials}
          maxLength={160}
          onChange={(event) => {
            setCredentials(event.target.value);
            setSaved(false);
          }}
        />
      </label>
      <button className="btn btn--secondary" type="submit" disabled={busy || !name.trim()}>
        Guardar firma
      </button>
      {saved && <span className="review__saved"> Guardada.</span>}
    </form>
  );
}

const STATE_CHIP: Record<ReviewItemState['state'], { label: string; className: string }> = {
  PENDING: { label: 'Pendiente', className: 'chip' },
  APPROVED: { label: 'Aprobado', className: 'chip chip--risk-low' },
  CHANGES: { label: 'Pide cambios', className: 'chip chip--risk-high' },
};

function ReviewCard({
  item,
  title,
  zone,
  busy,
  onJudge,
  children,
}: {
  item: ReviewItemState;
  title: string;
  zone: string | null;
  busy: boolean;
  onJudge: (key: string, verdict: ReviewVerdict, comment: string | null) => Promise<boolean>;
  children: ReactNode;
}) {
  const [writing, setWriting] = useState(false);
  const [comment, setComment] = useState(item.state === 'CHANGES' ? (item.comment ?? '') : '');
  const chip = STATE_CHIP[item.state];

  return (
    <article className="card review__item" style={zoneVars(zone)} aria-label={title}>
      <header className="review__head">
        <h3>{title}</h3>
        <span className={chip.className}>{chip.label}</span>
      </header>
      {item.outdated && (
        <p className="note">
          <strong>Ha cambiado desde tu última revisión:</strong> vuelve a mirarlo.
        </p>
      )}
      {children}
      {item.state === 'CHANGES' && item.comment && !writing && (
        <p className="review__comment">
          <strong>Tu comentario:</strong> {item.comment}
        </p>
      )}

      {writing ? (
        <form
          className="review__form"
          onSubmit={(event) => {
            event.preventDefault();
            void onJudge(item.key, 'CHANGES', comment).then((ok) => ok && setWriting(false));
          }}
        >
          <label className="field">
            <span className="field__label">¿Qué hay que cambiar?</span>
            <textarea
              className="input review__textarea"
              value={comment}
              maxLength={1000}
              rows={3}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          <div className="review__actions">
            <button className="btn btn--primary" type="submit" disabled={busy || !comment.trim()}>
              Enviar
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => setWriting(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="review__actions">
          {item.state !== 'APPROVED' && (
            <button
              className="btn btn--primary"
              disabled={busy}
              onClick={() => void onJudge(item.key, 'APPROVED', null)}
            >
              Aprobar
            </button>
          )}
          <button className="btn btn--ghost" disabled={busy} onClick={() => setWriting(true)}>
            {item.state === 'CHANGES' ? 'Cambiar comentario' : 'Pedir cambios'}
          </button>
        </div>
      )}
    </article>
  );
}

/** Cada ejercicio una sola vez, aunque aparezca en varias rutinas, ordenado por zona y nombre. */
function uniqueExercises(content: Content): Step[] {
  const bySlug = new Map<string, Step>();
  for (const routine of content.routines) {
    for (const step of routine.steps) {
      bySlug.set(step.exerciseSlug, step);
    }
  }
  const zoneOrder = content.zones.map((zone) => zone.code);
  const rank = (zone: string | null) => (zone === null ? zoneOrder.length : zoneOrder.indexOf(zone));
  return [...bySlug.values()].sort(
    (a, b) => rank(a.zone) - rank(b.zone) || a.name.localeCompare(b.name, 'es'),
  );
}
