import { Check, Search } from 'lucide-react';
import { type KeyboardEvent, useId, useState } from 'react';

import { getErrorMessage } from '@/api/apiError';
import { Avatar } from '@/components/common/Avatar';
import { Spinner } from '@/components/common/Spinner';
import { LOOKUP_MIN_LENGTH, useUserLookup } from '@/features/users';
import { type UserLookup } from '@/types/api';
import { cn } from '@/utils/cn';

export interface MemberPickerProps {
  /** Users already in the project: shown, but not selectable. */
  memberIds: ReadonlySet<string>;
  onSelect: (user: UserLookup) => void;
  disabled?: boolean;
}

/**
 * Search-as-you-type user picker following the WAI-ARIA combobox pattern: the input keeps focus, arrow
 * keys move a "virtual" highlight (aria-activedescendant), Enter picks it, Escape closes the list.
 * Results come from GET /api/users/lookup (active users only, ≥ 2 characters, debounced).
 */
export function MemberPicker({ memberIds, onSelect, disabled = false }: MemberPickerProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const lookup = useUserLookup(text);
  const results = lookup.enabled ? (lookup.data ?? []) : [];
  const selectable = results.filter((user) => !memberIds.has(user.id));
  const showList = open && lookup.enabled && !lookup.isPending;

  const pick = (user: UserLookup) => {
    if (memberIds.has(user.id)) return;
    onSelect(user);
    setText('');
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      if (results.length === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (current + step + results.length) % results.length);
    } else if (event.key === 'Enter' && showList) {
      event.preventDefault();
      const user = results[active];
      if (user) pick(user);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault(); // close the list, not the surrounding dialog/page
      setOpen(false);
    }
  };

  let status: string;
  if (!lookup.enabled) status = `Type at least ${LOOKUP_MIN_LENGTH} characters to search.`;
  else if (lookup.isPending || lookup.isDebouncing) status = 'Searching…';
  else if (lookup.isError) status = getErrorMessage(lookup.error);
  else if (results.length === 0) status = `No active users match "${lookup.term}".`;
  else
    status = `${results.length} ${results.length === 1 ? 'user' : 'users'} found, ${selectable.length} can be added.`;

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="mb-1.5 block text-sm font-medium text-foreground">
        Add a member
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${id}-option-${active}` : undefined}
          aria-describedby={`${id}-status`}
          autoComplete="off"
          placeholder="First name, last name or email"
          disabled={disabled}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
          }}
          onBlur={() => {
            setOpen(false);
          }}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-lg border bg-surface pr-9 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        />
        {lookup.isFetching ? (
          <Spinner className="absolute top-1/2 right-3 size-4 -translate-y-1/2" label={null} />
        ) : null}
      </div>
      <p id={`${id}-status`} className="mt-1.5 text-xs text-muted-foreground" aria-live="polite">
        {status}
      </p>

      <ul
        id={listId}
        role="listbox"
        aria-label="Matching users"
        hidden={!showList || results.length === 0}
        className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border bg-surface p-1 shadow-lg"
      >
        {results.map((user, index) => {
          const isMember = memberIds.has(user.id);
          return (
            <li
              key={user.id}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === active}
              aria-disabled={isMember || undefined}
              // mousedown, not click: it fires BEFORE the input's blur closes the list.
              onMouseDown={(event) => {
                event.preventDefault();
                pick(user);
              }}
              onMouseMove={() => {
                setActive(index);
              }}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm',
                index === active && 'bg-surface-muted',
                isMember && 'cursor-not-allowed opacity-60',
              )}
            >
              <Avatar name={user.fullName} decorative />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">{user.fullName}</span>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
              {isMember ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check aria-hidden="true" className="size-3.5" /> Member
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
