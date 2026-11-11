import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExerciseFigure, hasIllustration } from './ExerciseFigure';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ilustración de un ejercicio', () => {
  it('fija, es una imagen con el nombre del ejercicio y sin animaciones', () => {
    const { container } = render(<ExerciseFigure slug="media-sentadilla" name="Media sentadilla" />);

    expect(screen.getByRole('img', { name: 'Ilustración: Media sentadilla' })).toBeInTheDocument();
    expect(container.querySelectorAll('animate')).toHaveLength(0);
  });

  it('animada, el propio dibujo lleva el movimiento en bucle', () => {
    const { container } = render(<ExerciseFigure slug="media-sentadilla" name="Media sentadilla" animated />);
    const animations = [...container.querySelectorAll('animate')];

    expect(animations.length).toBeGreaterThan(5);
    expect(animations.every((animation) => animation.getAttribute('repeatCount') === 'indefinite')).toBe(true);
  });

  it('si el jugador pide menos movimiento, se queda fija', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
    const { container } = render(<ExerciseFigure slug="media-sentadilla" name="Media sentadilla" animated />);

    expect(container.querySelectorAll('animate')).toHaveLength(0);
  });

  it('como miniatura decorativa no se anuncia a los lectores de pantalla', () => {
    const { container } = render(<ExerciseFigure slug="media-sentadilla" name="Media sentadilla" decorative />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('un ejercicio sin ilustración no pinta nada', () => {
    const { container } = render(<ExerciseFigure slug="ejercicio-nuevo" name="Ejercicio nuevo" />);

    expect(hasIllustration('ejercicio-nuevo')).toBe(false);
    expect(container).toBeEmptyDOMElement();
  });
});
