import { type ReactNode } from 'react';

export interface AuthPagePlaceholderProps {
  title: string;
  description: string;
  children?: ReactNode;
}

/** Temporary content for logged-out pages until Phase 6 builds the real forms. */
export function AuthPagePlaceholder({ title, description, children }: AuthPagePlaceholderProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <p className="mt-4 rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
        The form for this page is built in Phase 6.
      </p>
      {children}
    </div>
  );
}
