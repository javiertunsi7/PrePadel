import { ILLUSTRATIONS } from './catalog';
import type { Illustration } from './engine';
import { FigureDrawing } from './ExerciseFigure';

/**
 * Hoja de revisión (solo en desarrollo, en /dev/ilustraciones): todas las
 * posturas clave de cada ejercicio, una por casilla.
 *   ?animadas     añade delante de cada ejercicio su animación (borde de color)
 *   ?solo=texto   enseña solo los ejercicios cuyo nombre contiene ese texto
 *   ?grande       casillas grandes, para mirar el detalle
 */
export default function DevSheet() {
  const params = new URLSearchParams(window.location.search);
  const withAnimations = params.has('animadas');
  const only = params.get('solo')?.split(',') ?? [];
  const entries = Object.entries(ILLUSTRATIONS).filter(
    ([slug]) => only.length === 0 || only.some((text) => slug.includes(text)),
  );

  return (
    <div className={params.has('grande') ? 'dev-sheet dev-sheet--big' : 'dev-sheet'}>
      {entries.flatMap(([slug, illustration]) => [
        ...(withAnimations
          ? [
              <figure key={`${slug}-live`} className="dev-sheet__cell dev-sheet__cell--live">
                <FigureDrawing illustration={illustration} label={slug} animated />
                <figcaption>{slug}</figcaption>
              </figure>,
            ]
          : []),
        ...illustration.frames.map((_, index) => (
          <figure key={`${slug}-${index}`} className="dev-sheet__cell">
            <FigureDrawing illustration={{ ...illustration, still: index } as Illustration} label={`${slug} ${index}`} />
            <figcaption>
              {slug} · {index}
            </figcaption>
          </figure>
        )),
      ])}
    </div>
  );
}
