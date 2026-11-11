import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { AppStore } from '../lib/store';
import { fakeApi, registeredStore, renderApp } from '../test/fixtures';
import { RoutineScreen } from './RoutineScreen';

function renderRoutine(store: AppStore, slug: string) {
  return renderApp(
    <Routes>
      <Route path="/rutina/:slug" element={<RoutineScreen />} />
      <Route path="/" element={<p>Pantalla de inicio</p>} />
    </Routes>,
    store,
    `/rutina/${slug}`,
  );
}

describe('pantalla de rutina', () => {
  it('antes de empezar enseña los ejercicios, la duración y el material', async () => {
    renderRoutine(await registeredStore(fakeApi()), 'codo-semana-1');

    expect(screen.getByRole('heading', { name: 'Codo de pádel · Semana 1' })).toBeInTheDocument();
    expect(screen.getByText('Apretón de pelota')).toBeInTheDocument();
    expect(screen.getByText('Movilidad de muñeca')).toBeInTheDocument();
    expect(screen.getByText('2 ejercicios')).toBeInTheDocument();
    expect(screen.getByText(/Pelota de pádel/)).toBeInTheDocument();
  });

  it('cada ejercicio lleva su miniatura, o su número si aún no tiene dibujo', async () => {
    renderRoutine(await registeredStore(fakeApi()), 'codo-semana-1');

    const illustrated = screen.getByRole('button', { name: /Apretón de pelota/ });
    const plain = screen.getByRole('button', { name: /Movilidad de muñeca/ });

    expect(illustrated.querySelector('svg.figure')).toBeInTheDocument();
    expect(plain.querySelector('svg.figure')).not.toBeInTheDocument();
    expect(plain).toHaveTextContent(/^2/);
  });

  it('tocar un ejercicio abre su ficha con el dibujo en movimiento y la explicación', async () => {
    const user = userEvent.setup();
    renderRoutine(await registeredStore(fakeApi()), 'codo-semana-1');

    await user.click(screen.getByRole('button', { name: /Apretón de pelota/ }));
    const sheet = screen.getByRole('dialog', { name: 'Apretón de pelota' });

    expect(within(sheet).getByRole('img', { name: 'Ilustración: Apretón de pelota' })).toBeInTheDocument();
    expect(sheet.querySelector('animate')).toBeInTheDocument();
    expect(within(sheet).getByText('Cómo se hace Apretón de pelota.')).toBeInTheDocument();
    expect(within(sheet).getByText('3 apretones por mano')).toBeInTheDocument();
    expect(within(sheet).getByText('Cambia de lado a mitad')).toBeInTheDocument();
    expect(sheet).toHaveTextContent('Necesitas: Pelota de pádel');

    await user.click(within(sheet).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('al empezar muestra la cuenta atrás y el primer ejercicio con su ilustración', async () => {
    const user = userEvent.setup();
    renderRoutine(await registeredStore(fakeApi()), 'calentamiento-prepartido');

    await user.click(screen.getByRole('button', { name: 'Empezar' }));

    expect(screen.getByText('Prepárate')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('5');
    expect(screen.getByRole('heading', { name: 'Marcha activa' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ilustración: Marcha activa' })).toBeInTheDocument();
  });

  it('un ejercicio sin ilustración se reproduce igual, solo con el reloj y el texto', async () => {
    const user = userEvent.setup();
    renderRoutine(await registeredStore(fakeApi()), 'codo-semana-1');

    await user.click(screen.getByRole('button', { name: 'Empezar' }));
    const skip = screen.getByRole('button', { name: 'Saltar al siguiente ejercicio' });
    await user.click(skip);
    expect(screen.getByRole('img', { name: 'Ilustración: Apretón de pelota' })).toBeInTheDocument();

    await user.click(skip);
    expect(screen.getByRole('heading', { name: 'Movilidad de muñeca' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Cómo se hace Movilidad de muñeca.')).toBeInTheDocument();
  });

  it('al llegar al final guarda la rutina y pregunta por la zona trabajada', async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    renderRoutine(await registeredStore(api), 'codo-semana-1');

    await user.click(screen.getByRole('button', { name: 'Empezar' }));
    const skip = screen.getByRole('button', { name: 'Saltar al siguiente ejercicio' });
    await user.click(skip); // cuenta atrás -> ejercicio 1
    expect(screen.getByText('Ejercicio 1 de 2')).toBeInTheDocument();
    await user.click(skip); // -> ejercicio 2
    await user.click(skip); // -> final

    expect(await screen.findByRole('heading', { name: '¡Rutina hecha!' })).toBeInTheDocument();
    expect(api.send).toHaveBeenCalledWith(
      'token-de-prueba',
      '/me/completions',
      expect.objectContaining({ routineSlug: 'codo-semana-1' }),
    );

    await user.click(within(screen.getByRole('radiogroup', { name: 'Dolor en Codo' })).getByRole('radio', { name: /^2 de 10/ }));
    expect(api.send).toHaveBeenCalledWith(
      'token-de-prueba',
      '/me/pain',
      expect.objectContaining({ zone: 'ELBOW', score: 2, context: 'CHECK_IN' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Guardado: 2/10');
  });

  it('salir a mitad pausa la rutina y pide confirmación', async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    renderRoutine(await registeredStore(api), 'calentamiento-prepartido');
    await user.click(screen.getByRole('button', { name: 'Empezar' }));

    await user.click(screen.getByRole('button', { name: 'Salir de la rutina' }));
    const dialog = screen.getByRole('dialog', { name: 'Salir de la rutina' });
    expect(screen.getByText('En pausa')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Seguir con la rutina' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Prepárate')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Salir de la rutina' }));
    await user.click(screen.getByRole('button', { name: 'Salir' }));
    expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument();
    expect(api.send).not.toHaveBeenCalled();
  });

  it('una rutina que no existe devuelve a inicio', async () => {
    renderRoutine(await registeredStore(fakeApi()), 'no-existe');

    expect(screen.getByText('Pantalla de inicio')).toBeInTheDocument();
  });
});
