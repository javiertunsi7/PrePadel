import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { NetworkError } from '../lib/api';
import { AppStore } from '../lib/store';
import { fakeApi, registeredStore, renderApp } from '../test/fixtures';
import { Onboarding } from './Onboarding';

function renderOnboarding(store: AppStore) {
  return renderApp(
    <Routes>
      <Route path="/bienvenida" element={<Onboarding />} />
      <Route path="/" element={<p>Pantalla de inicio</p>} />
    </Routes>,
    store,
    '/bienvenida',
  );
}

/** Rellena el cuestionario hasta dejarlo en el paso de consentimiento. */
async function answerQuestions(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Empezar/ }));

  await user.type(screen.getByLabelText('¿Cuántos años tienes?'), '47');
  await user.click(screen.getByRole('button', { name: 'Una hora más' }));
  await user.click(screen.getByRole('button', { name: 'Intermedio' }));
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));

  const elbow = await screen.findByRole('radiogroup', { name: 'Molestia en Codo' });
  await user.click(within(elbow).getByRole('radio', { name: /^6 de 10/ }));
  await user.click(screen.getByRole('button', { name: 'Siguiente' }));
}

describe('cuestionario inicial', () => {
  it('lleva de las preguntas al perfil de riesgo y al programa recomendado', async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    renderOnboarding(new AppStore(api));

    await answerQuestions(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Crear mi plan' }));

    expect(await screen.findByRole('heading', { name: 'Tu punto de partida' })).toBeInTheDocument();
    expect(api.register).toHaveBeenCalledExactlyOnceWith({
      age: 47,
      weeklyHours: 4,
      level: 'INTERMEDIATE',
      discomfort: { ELBOW: 6, KNEE: 0 },
      healthDataConsent: true,
    });
    expect(screen.getByText('Riesgo alto')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Codo de pádel' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Empezar este programa' }));

    expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument();
    expect(api.send).toHaveBeenCalledWith('token-de-prueba', '/me/enrollment', { programSlug: 'codo-de-padel' });
  });

  it('no deja seguir sin edad válida ni nivel', async () => {
    const user = userEvent.setup();
    renderOnboarding(new AppStore(fakeApi()));
    await user.click(screen.getByRole('button', { name: /Empezar/ }));

    const next = screen.getByRole('button', { name: 'Siguiente' });
    expect(next).toBeDisabled();

    await user.type(screen.getByLabelText('¿Cuántos años tienes?'), '12');
    await user.click(screen.getByRole('button', { name: 'Avanzado' }));
    expect(next).toBeDisabled();

    await user.clear(screen.getByLabelText('¿Cuántos años tienes?'));
    await user.type(screen.getByLabelText('¿Cuántos años tienes?'), '52');
    expect(next).toBeEnabled();
  });

  it('no crea el plan sin consentimiento para los datos de salud', async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    renderOnboarding(new AppStore(api));

    await answerQuestions(user);

    expect(screen.getByRole('button', { name: 'Crear mi plan' })).toBeDisabled();
    expect(api.register).not.toHaveBeenCalled();
  });

  it('sin conexión lo explica y deja reintentar', async () => {
    const user = userEvent.setup();
    const register = vi
      .fn(fakeApi().register)
      .mockRejectedValueOnce(new NetworkError());
    renderOnboarding(new AppStore(fakeApi({ register })));

    await answerQuestions(user);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Crear mi plan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión');

    await user.click(screen.getByRole('button', { name: 'Crear mi plan' }));
    expect(await screen.findByRole('heading', { name: 'Tu punto de partida' })).toBeInTheDocument();
  });

  it('quien ya tiene plan va directo a inicio', async () => {
    renderOnboarding(await registeredStore(fakeApi()));

    expect(screen.getByText('Pantalla de inicio')).toBeInTheDocument();
  });
});
