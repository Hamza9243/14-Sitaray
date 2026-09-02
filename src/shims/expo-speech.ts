interface SpeakOptions {
  language?: string;
  rate?: number;
  onBoundary?: (event: { charIndex: number; charLength: number }) => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
}

/**
 * Drop-in replacement for expo-speech, aliased in vite.config.ts — backed by the
 * standard Web Speech API (`speechSynthesis`), which every evergreen mobile and
 * desktop browser (and the Capacitor WebView shell) implements natively. Fires the
 * same `onBoundary`/`onDone`/`onStopped` callbacks SyncedTextHighlight relies on.
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(text);
  if (options.language) utterance.lang = options.language;
  // expo-speech's `rate` is ~0.5x-2x around 1 = normal, same convention as SpeechSynthesisUtterance.rate.
  if (options.rate) utterance.rate = options.rate;

  utterance.onboundary = (event) => {
    if (event.name === 'word' || event.charLength > 0) {
      options.onBoundary?.({ charIndex: event.charIndex, charLength: event.charLength });
    }
  };
  utterance.onend = () => options.onDone?.();
  utterance.onerror = () => options.onError?.();

  window.speechSynthesis.speak(utterance);
}

export function stop(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
