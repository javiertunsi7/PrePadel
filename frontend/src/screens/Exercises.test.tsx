import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fakeApi, registeredStore, renderApp } from '../test/fixtures';
import { Exercises } from './Exercises';

describe('galería de ejercicios', () => {
  it('enseña cada ejercicio una sola vez, agrupado por zona', async () => {
    renderApp(<Exercises />, await registeredStore(fakeApi()));

    // El catálogo de prueba tiene 4 ejercicios; dos de ellos se repiten en dos rutinas.
    expect(screen.getByText(/Los 4 ejercicios de PrePádel/)).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Codo',
      'Generales',
    ]);
  });

  it('avisa de que el contenido y las ilustraciones están pendientes de validar', async () => {
    renderApp(<Exercises />, await registeredStore(fakeApi()));

    expect(screen.getByText(/pendientes de validación por un fisioterapeuta/)).toHaveTextContent(
      'Las ilustraciones son esquemas orientativos',
    );
  });

  it('al tocar un ejercicio se abre su ficha y se cierra con Escape', async () => {
    const user = userEvent.setup();
    renderApp(<Exercises />, await registeredStore(fakeApi()));

    await user.click(screen.getByRole('button', { name: 'Marcha activa' }));
    const sheet = screen.getByRole('dialog', { name: 'Marcha activa' });
    expect(within(sheet).getByText('Cómo se hace Marcha activa.')).toBeInTheDocument();
    expect(within(sheet).getByRole('img', { name: 'Ilustración: Marcha activa' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
