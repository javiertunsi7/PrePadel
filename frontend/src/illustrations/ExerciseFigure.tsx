import { useEffect, useId, useMemo, useRef } from 'react';
import { ILLUSTRATIONS } from './catalog';
import { FRAME, buildModel, type Illustration } from './engine';

export function hasIllustration(slug: string): boolean {
  return Object.hasOwn(ILLUSTRATIONS, slug);
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Dibuja una ilustración. Animada, el movimiento lo hace el propio SVG en bucle
 * (sin JavaScript por fotograma); fija, enseña la postura más representativa.
 * Si `label` es null la imagen es decorativa y los lectores de pantalla la ignoran.
 */
export function FigureDrawing({
  illustration,
  label,
  animated = false,
  paused = false,
}: {
  illustration: Illustration;
  label: string | null;
  animated?: boolean;
  paused?: boolean;
}) {
  const arrowId = `flecha-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const svg = useRef<SVGSVGElement>(null);
  const moving = animated && !prefersReducedMotion();
  const model = useMemo(() => buildModel(illustration, moving), [illustration, moving]);

  useEffect(() => {
    const element = svg.current;
    if (!element || model.seconds === 0) {
      return;
    }
    // jsdom (tests) no implementa las animaciones de SVG
    if (paused) {
      element.pauseAnimations?.();
    } else {
      element.unpauseAnimations?.();
    }
  }, [paused, model]);

  return (
    <svg
      ref={svg}
      className="figure"
      viewBox={`${FRAME.left} ${FRAME.top} ${FRAME.width} ${FRAME.height}`}
      {...(label === null ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label })}
    >
      <defs>
        <marker id={arrowId} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path className="fig-arrowhead" d="M1 1 L7 4 L1 7" />
        </marker>
      </defs>
      {model.shapes.map((shape, index) => {
        const animations = shape.animations.map(({ attr, values }) => (
          <animate key={attr} attributeName={attr} values={values} dur={`${model.seconds}s`} repeatCount="indefinite" />
        ));
        if (shape.kind === 'path') {
          return (
            <path
              key={index}
              className={shape.cls}
              {...shape.attrs}
              markerEnd={shape.cls === 'fig-arrow' ? `url(#${arrowId})` : undefined}
            >
              {animations}
            </path>
          );
        }
        if (shape.kind === 'circle') {
          return (
            <circle key={index} className={shape.cls} {...shape.attrs}>
              {animations}
            </circle>
          );
        }
        return (
          <text key={index} className={shape.cls} {...shape.attrs}>
            {shape.text}
          </text>
        );
      })}
    </svg>
  );
}

/** Ilustración de un ejercicio del catálogo; no pinta nada si el ejercicio aún no tiene dibujo. */
export function ExerciseFigure({
  slug,
  name,
  animated = false,
  paused = false,
  decorative = false,
}: {
  slug: string;
  name: string;
  animated?: boolean;
  paused?: boolean;
  decorative?: boolean;
}) {
  if (!hasIllustration(slug)) {
    return null;
  }
  return (
    <FigureDrawing
      illustration={ILLUSTRATIONS[slug]}
      label={decorative ? null : `Ilustración: ${name}`}
      animated={animated}
      paused={paused}
    />
  );
}
