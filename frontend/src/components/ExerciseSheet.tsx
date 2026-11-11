import { useEffect, type ReactNode } from 'react';
import { ExerciseFigure, hasIllustration } from '../illustrations/ExerciseFigure';
import { formatSeconds } from '../lib/derive';
import type { Step } from '../lib/types';
import { zoneVars } from '../lib/zones';
import { CloseIcon } from './Icons';

/** Lo que hace falta saber de un ejercicio para enseñarlo, venga de la rutina que venga. */
export type ExerciseInfo = Pick<
  Step,
  'exerciseSlug' | 'name' | 'zone' | 'instructions' | 'equipment' | 'switchSides' | 'videoUrl'
>;

export function hasMedia(exercise: ExerciseInfo): boolean {
  return Boolean(exercise.videoUrl) || hasIllustration(exercise.exerciseSlug);
}

/** El vídeo del ejercicio si ya existe; si no, su ilustración. */
export function ExerciseMedia({ exercise, paused = false }: { exercise: ExerciseInfo; paused?: boolean }) {
  if (exercise.videoUrl) {
    return <video className="media-video" src={exercise.videoUrl} muted loop playsInline autoPlay />;
  }
  return <ExerciseFigure slug={exercise.exerciseSlug} name={exercise.name} animated paused={paused} />;
}

/** Miniatura fija para listas; sin dibujo, el hueco enseña `fallback`. */
export function ExerciseThumb({ exercise, fallback }: { exercise: ExerciseInfo; fallback?: ReactNode }) {
  return (
    <span className="thumb" style={zoneVars(exercise.zone)}>
      {hasIllustration(exercise.exerciseSlug) ? (
        <ExerciseFigure slug={exercise.exerciseSlug} name={exercise.name} decorative />
      ) : (
        fallback
      )}
    </span>
  );
}

/** Ficha "cómo se hace": ilustración en movimiento, explicación y material. */
export function ExerciseSheet({
  exercise,
  dose,
  onClose,
}: {
  exercise: ExerciseInfo;
  /** Duración y dosis dentro de una rutina concreta. */
  dose?: { seconds: number; dosage: string | null };
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="sheet"
      role="dialog"
      aria-modal="true"
      aria-label={exercise.name}
      style={zoneVars(exercise.zone)}
      onClick={onClose}
    >
      <div className="card sheet__body exercise-sheet" onClick={(event) => event.stopPropagation()}>
        <button className="icon-btn exercise-sheet__close" aria-label="Cerrar" onClick={onClose}>
          <CloseIcon />
        </button>
        {hasMedia(exercise) && (
          <div className="exercise-sheet__media">
            <ExerciseMedia exercise={exercise} />
          </div>
        )}
        <h2>{exercise.name}</h2>
        {(dose || exercise.switchSides) && (
          <div className="chips chips--center">
            {dose && <span className="chip">{formatSeconds(dose.seconds)}</span>}
            {dose?.dosage && <span className="chip">{dose.dosage}</span>}
            {exercise.switchSides && <span className="chip">Cambia de lado a mitad</span>}
          </div>
        )}
        <p>{exercise.instructions}</p>
        {exercise.equipment && (
          <p className="note">
            <strong>Necesitas:</strong> {exercise.equipment}
          </p>
        )}
      </div>
    </div>
  );
}
