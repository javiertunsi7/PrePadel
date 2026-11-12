import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppStore } from '../lib/store';
import type { ReviewState } from '../lib/types';
import { content, fakeApi, renderApp } from '../test/fixtures';
import Review from './Review';

function reviewState(overrides: Partial<ReviewState> = {}): ReviewState {
  const keys = [
    'rule:pain',
    'rule:risk',
    ...new Set(content.routines.flatMap((routine) => routine.steps.map((step) => `exercise:${step.exerciseSlug}`))),
    ...content.routines.map((routine) => `routine:${routine.slug}`),
    ...content.programs.map((program) => `program:${program.slug}`),
  ];
  return {
    status: 'DRAFT',
    reviewerName: null,
    reviewerCredentials: null,
    approved: 0,
    total: keys.length,
    items: keys.map((key) => ({ key, state: 'PENDING', comment: null, reviewedAt: null, outdated: false })),
    riskWeights: ['Cada punto de dolor actual (0 a 10) suma 7 puntos.'],
    ...overrides,
  };
}

/** Servidor de mentira: responde según la contraseña y guarda lo que se le pide. */
function fakeServer(state: ReviewState) {
  const calls: { method: string; url: string; body: unknown }[] = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const headers = init.headers as Record<string, string>;
    calls.push({ method: init.method ?? 'GET', url, body: init.body ? JSON.parse(init.body as string) : null });
    if (headers.Authorization !== `Basic ${btoa(':clave-del-fisio')}`) {
      return new Response(JSON.stringify({ title: 'Unauthorized' }), { status: 401 });
    }
    return new Response(JSON.stringify(state), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

async function renderReview() {
  const store = new AppStore(fakeApi());
  await store.sync();
  renderApp(<Review />, store, '/revision');
}

async function enter(user: ReturnType<typeof userEvent.setup>, password: string) {
  await user.type(screen.getByLabelText('Contraseña de revisión'), password);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('revisión del fisioterapeuta', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('pide la contraseña y explica si no es la buena', async () => {
    fakeServer(reviewState());
    const user = userEvent.setup();
    await renderReview();

    await enter(user, 'otra');

    expect(await screen.findByRole('alert')).toHaveTextContent('Contraseña incorrecta');
  });

  it('enseña cada pieza con su estado, las reglas y el progreso', async () => {
    fakeServer(reviewState());
    const user = userEvent.setup();
    await renderReview();

    await enter(user, 'clave-del-fisio');

    expect(await screen.findByText(/0 de \d+ aprobados/)).toBeInTheDocument();
    expect(screen.getByText('Cada punto de dolor actual (0 a 10) suma 7 puntos.')).toBeInTheDocument();
    const exercise = screen.getByRole('article', { name: 'Apretón de pelota' });
    expect(within(exercise).getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: content.programs[0].name })).toBeInTheDocument();
  });

  it('aprobar y pedir cambios mandan el veredicto de esa pieza', async () => {
    const calls = fakeServer(reviewState());
    const user = userEvent.setup();
    await renderReview();
    await enter(user, 'clave-del-fisio');

    const exercise = await screen.findByRole('article', { name: 'Apretón de pelota' });
    await user.click(within(exercise).getByRole('button', { name: 'Aprobar' }));
    expect(calls.at(-1)).toMatchObject({
      method: 'PUT',
      url: expect.stringContaining('/api/review/items/exercise%3A'),
      body: { verdict: 'APPROVED', comment: null },
    });

    await user.click(within(exercise).getByRole('button', { name: 'Pedir cambios' }));
    await user.type(within(exercise).getByLabelText('¿Qué hay que cambiar?'), 'Menos repeticiones');
    await user.click(within(exercise).getByRole('button', { name: 'Enviar' }));
    expect(calls.at(-1)).toMatchObject({ body: { verdict: 'CHANGES', comment: 'Menos repeticiones' } });
  });

  it('la firma se guarda con nombre y colegiado', async () => {
    const calls = fakeServer(reviewState());
    const user = userEvent.setup();
    await renderReview();
    await enter(user, 'clave-del-fisio');

    await user.type(await screen.findByLabelText('Nombre y apellidos'), 'Ana Ruiz');
    await user.type(screen.getByLabelText('Titulación y nº de colegiado'), 'Fisioterapeuta, col. 1234');
    await user.click(screen.getByRole('button', { name: 'Guardar firma' }));

    expect(calls.at(-1)).toMatchObject({
      method: 'PUT',
      url: '/api/review/reviewer',
      body: { name: 'Ana Ruiz', credentials: 'Fisioterapeuta, col. 1234' },
    });
    expect(await screen.findByText('Guardada.')).toBeInTheDocument();
  });

  it('con todo aprobado dice que la app ya no avisa de borrador', async () => {
    const all = reviewState();
    fakeServer({
      ...all,
      status: 'REVIEWED',
      reviewerName: 'Ana Ruiz',
      approved: all.total,
      items: all.items.map((item) => ({ ...item, state: 'APPROVED' })),
    });
    const user = userEvent.setup();
    await renderReview();
    await enter(user, 'clave-del-fisio');

    expect(await screen.findByText(/la app ya no avisa de que es un borrador/)).toBeInTheDocument();
    await user.click(screen.getByLabelText('Ocultar lo ya aprobado'));
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
