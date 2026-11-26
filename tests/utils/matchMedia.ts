/**
 * Controllable window.matchMedia for jsdom (which has none). Tests can simulate the operating
 * system preferring dark mode, and switching it live:
 *
 *   setSystemPrefersDark(true);   // before rendering
 *   act(() => { setSystemPrefersDark(false); });   // fires 'change' listeners
 */
type Listener = (event: MediaQueryListEvent) => void;

let prefersDark = false;
const listeners = new Set<Listener>();

function matches(query: string): boolean {
  return query.includes('prefers-color-scheme: dark') ? prefersDark : false;
}

export function installMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        get matches() {
          return matches(query);
        },
        media: query,
        onchange: null,
        addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
        removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
        addListener: (listener: Listener) => listeners.add(listener),
        removeListener: (listener: Listener) => listeners.delete(listener),
        dispatchEvent: () => true,
      }) as unknown as MediaQueryList,
  });
}

export function setSystemPrefersDark(value: boolean): void {
  prefersDark = value;
  const event = { matches: value, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent;
  listeners.forEach((listener) => {
    listener(event);
  });
}

export function resetMatchMedia(): void {
  prefersDark = false;
  listeners.clear();
}
