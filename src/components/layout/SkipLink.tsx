/**
 * First focusable element on every page: keyboard users press Tab once and jump past the
 * sidebar straight to the content. Invisible until focused.
 */
export function SkipLink({ targetId = 'main-content' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="fixed top-2 left-2 z-[200] -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-transform focus:translate-y-0"
    >
      Skip to main content
    </a>
  );
}
