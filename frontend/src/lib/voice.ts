// Modo manos libres: voz del propio móvil (funciona sin cobertura) y pitidos.

let audio: AudioContext | null = null;

/**
 * Los navegadores solo dejan sonar tras un toque del usuario: hay que llamar a
 * esto desde el botón de "Empezar" para que la voz y los pitidos funcionen después.
 */
export function unlockAudio(): void {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    audio = null;
  }
  if ('speechSynthesis' in window) {
    // Una frase muda dentro del toque desbloquea la voz en iOS.
    const silent = new SpeechSynthesisUtterance(' ');
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
  }
}

export function say(text: string): void {
  if (!('speechSynthesis' in window)) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  window.speechSynthesis.cancel(); // la frase nueva manda sobre la anterior
  window.speechSynthesis.speak(utterance);
}

export function hush(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/** Pitido corto de cuenta atrás; más agudo y largo al cambiar de ejercicio. */
export function beep(final: boolean): void {
  if (!audio) {
    return;
  }
  const duration = final ? 0.35 : 0.12;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = final ? 1175 : 880;
  gain.gain.setValueAtTime(0.25, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
}
