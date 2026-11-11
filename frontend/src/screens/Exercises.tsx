import { useState } from 'react';
import { Link } from 'react-router';
import { ExerciseSheet, ExerciseThumb, type ExerciseInfo } from '../components/ExerciseSheet';
import { BackIcon } from '../components/Icons';
import { reviewText } from '../lib/copy';
import { useAppState } from '../lib/store';
import type { Content } from '../lib/types';
import { zoneVars } from '../lib/zones';

/** Cada ejercicio una sola vez, aunque aparezca en varias rutinas. */
function uniqueExercises(content: Content): ExerciseInfo[] {
  const bySlug = new Map<string, ExerciseInfo>();
  for (const routine of content.routines) {
    for (const step of routine.steps) {
      bySlug.set(step.exerciseSlug, step);
    }
  }
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** Todos los ejercicios con su ilustración: para repasarlos y para que los revise el fisioterapeuta. */
export function Exercises() {
  const { content } = useAppState();
  const [opened, setOpened] = useState<ExerciseInfo | null>(null);
  if (!content) {
    return null;
  }
  const exercises = uniqueExercises(content);
  const groups = [
    ...content.zones.map((zone) => ({ title: zone.name, zone: zone.code as string | null })),
    { title: 'Generales', zone: null },
  ];

  return (
    <>
      <Link to="/perfil" className="back-link">
        <BackIcon size={20} /> Perfil
      </Link>
      <h1>Ejercicios</h1>
      <p className="lead">
        Los {exercises.length} ejercicios de PrePádel. Toca uno para ver cómo se hace.
      </p>
      <p className="note">{reviewText(content)} Las ilustraciones son esquemas orientativos.</p>

      {groups.map((group) => {
        const items = exercises.filter((exercise) => exercise.zone === group.zone);
        if (items.length === 0) {
          return null;
        }
        return (
          <section key={group.title} style={zoneVars(group.zone)}>
            <h2 className="section-title">{group.title}</h2>
            <div className="exercise-grid">
              {items.map((exercise) => (
                <button key={exercise.exerciseSlug} className="exercise-tile" onClick={() => setOpened(exercise)}>
                  <ExerciseThumb exercise={exercise} />
                  <strong>{exercise.name}</strong>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {opened && <ExerciseSheet exercise={opened} onClose={() => setOpened(null)} />}
    </>
  );
}
