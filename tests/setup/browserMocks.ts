import { installMatchMedia } from '../utils/matchMedia';

/**
 * Browser APIs that jsdom doesn't implement but real browsers (and Radix UI) use.
 * These are minimal stand-ins, not behaviour under test. TypeScript's DOM types claim the APIs
 * always exist, so presence is checked at runtime with `in` instead of `??=`.
 */
installMatchMedia();

class ResizeObserverStub implements ResizeObserver {
  observe(): void {
    // No-op: jsdom does not compute layout, so there is never a size change to report.
  }
  unobserve(): void {
    // No-op (see observe).
  }
  disconnect(): void {
    // No-op (see observe).
  }
}

if (!('ResizeObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverStub,
    configurable: true,
    writable: true,
  });
}

// Radix uses pointer capture (menus) and scrollIntoView (focus management).
const elementStubs = {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
};

for (const [name, stub] of Object.entries(elementStubs)) {
  if (!(name in Element.prototype)) {
    Object.defineProperty(Element.prototype, name, {
      value: stub,
      configurable: true,
      writable: true,
    });
  }
}
