import { afterEach, describe, expect, it } from 'vitest';
import { captureClubLink, pendingClub } from './club';

function openAt(path: string) {
  window.history.replaceState(null, '', path);
}

function currentPath(): string {
  return window.location.pathname + window.location.search + window.location.hash;
}

describe('enlace de club', () => {
  afterEach(() => openAt('/'));

  it('guarda el club del enlace y lo quita de la dirección sin tocar lo demás', () => {
    openAt('/bienvenida?club=Padel-Elche&origen=cartel#arriba');

    captureClubLink(false);

    expect(pendingClub()).toBe('padel-elche');
    expect(currentPath()).toBe('/bienvenida?origen=cartel#arriba');
  });

  it('un código que no vale no se guarda, pero también se quita de la dirección', () => {
    openAt('/?club=%3Cb%3Eclub%3C%2Fb%3E');

    captureClubLink(false);

    expect(pendingClub()).toBeNull();
    expect(currentPath()).toBe('/');
  });

  it('quien ya tiene plan no cambia de club por abrir otro enlace', () => {
    openAt('/?club=padel-elche');

    captureClubLink(true);

    expect(pendingClub()).toBeNull();
    expect(currentPath()).toBe('/');
  });

  it('sin enlace de club no hace nada', () => {
    openAt('/programas?zona=codo');

    captureClubLink(false);

    expect(pendingClub()).toBeNull();
    expect(currentPath()).toBe('/programas?zona=codo');
  });
});
