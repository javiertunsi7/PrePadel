import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PainScale } from './PainScale';

describe('escala de dolor', () => {
  it('ofrece del 0 al 10 y con un toque avisa del valor elegido', async () => {
    const onSelect = vi.fn();
    render(<PainScale value={null} label="Dolor en Codo" onSelect={onSelect} />);

    expect(screen.getAllByRole('radio')).toHaveLength(11);
    await userEvent.click(screen.getByRole('radio', { name: /^7 de 10/ }));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(7);
  });

  it('marca solo el valor ya registrado', () => {
    render(<PainScale value={3} label="Dolor en Codo" onSelect={() => {}} />);

    expect(screen.getByRole('radio', { name: /^3 de 10/ })).toBeChecked();
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
  });

  it('describe cada valor con palabras para lectores de pantalla', () => {
    render(<PainScale value={null} label="Dolor en Codo" onSelect={() => {}} />);

    expect(screen.getByRole('radio', { name: '0 de 10, nada' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '5 de 10, moderado' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '9 de 10, fuerte' })).toBeInTheDocument();
  });
});
