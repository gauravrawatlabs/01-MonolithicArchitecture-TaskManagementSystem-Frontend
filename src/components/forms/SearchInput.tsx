import { Search, X } from 'lucide-react';
import { type ComponentProps } from 'react';

import { Input } from '@/components/common/Input';
import { cn } from '@/utils/cn';

export interface SearchInputProps extends Omit<
  ComponentProps<'input'>,
  'type' | 'value' | 'onChange'
> {
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible name, e.g. "Search categories" (there is no visible label). */
  label: string;
}

/** A search box with an icon and a clear button. type="search" gives Escape-to-clear on most browsers. */
export function SearchInput({
  value,
  onValueChange,
  label,
  className,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
        }}
        className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onValueChange('');
          }}
          className="absolute top-1/2 right-1.5 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
