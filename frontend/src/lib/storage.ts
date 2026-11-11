// Copia local en el móvil. Si el almacenamiento falla (modo privado, disco lleno)
// la app sigue funcionando en memoria: por eso ningún error sale de aquí.

export function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sin almacenamiento: se pierde al cerrar, pero no rompe la sesión
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // nada que hacer
  }
}
