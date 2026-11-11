import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom no tiene scroll: la app solo lo usa para volver arriba al cambiar de pantalla.
window.scrollTo = vi.fn();

afterEach(() => {
  cleanup();
  localStorage.clear();
});
