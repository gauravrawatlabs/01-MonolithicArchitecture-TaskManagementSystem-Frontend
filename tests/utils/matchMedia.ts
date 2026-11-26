/**
 * Controllable window.matchMedia for jsdom (which has none). Supports the two kinds of query the
 * app uses: (prefers-color-scheme: dark) and (min-width: Npx). Tests can change both live:
 *
 *   setSystemPrefersDark(true);           act(() => { setViewportWidth(375); });
 */
type Listener = (event: MediaQueryListEvent) => void;

const DEFAULT_WIDTH = 1280; // desktop, so tests see the full sidebar unless they say otherwise
let prefersDark = false;
let viewportWidth = DEFAULT_WIDTH;
const listeners = new Set<Listener>();

function matches(query: string): boolean {
  if (query.includes('prefers-color-scheme: dark')) return prefersDark;
  const minWidth = /min-width:\s*(\d+)px/.exec(query)?.[1];
  if (minWidth) return viewportWidth >= Number(minWidth);
  return false;
}

function notify(): void {
  listeners.forEach((listener) => {
    listener({ matches: prefersDark, media: '' } as MediaQueryListEvent);
  });
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
  notify();
}

export function setViewportWidth(width: number): void {
  viewportWidth = width;
  notify();
}

export function resetMatchMedia(): void {
  prefersDark = false;
  viewportWidth = DEFAULT_WIDTH;
  listeners.clear();
}
