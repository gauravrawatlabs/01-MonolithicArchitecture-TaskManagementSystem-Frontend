import { useId } from 'react';

import { Select } from '@/components/common/Select';
import { Switch } from '@/components/common/Switch';
import { SearchInput } from '@/components/forms/SearchInput';
import { TASK_PRIORITIES, TASK_PRIORITY_META } from '@/constants/taskMeta';
import { isEmailVerified, useAuth } from '@/features/auth';
import { useProjectContext } from '@/features/projects';
import { VERIFY_TO_CHANGE_TASKS } from '@/features/tasks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useUrlState } from '@/hooks/useUrlState';

import { KanbanBoard } from '../components/KanbanBoard';

/**
 * /projects/:id/board: the project's Kanban. Filters apply to every column and live in the URL
 * (?search=&priority=&assignee=&cancelled=true).
 */
export function ProjectBoardPage() {
  const { project } = useProjectContext();
  const { user } = useAuth();
  const cancelledId = useId();
  const [url, updateUrl] = useUrlState({ search: '', priority: '', assignee: '', cancelled: '' });
  const search = useDebouncedValue(url.search, 300);

  return (
    // grid-cols-1 = minmax(0, 1fr): without it the grid column grows to the board's full width (grid items
    // default to min-width: auto) and the whole PAGE scrolls sideways instead of just the board.
    <div className="grid grid-cols-1 gap-4">
      {isEmailVerified(user) ? null : (
        <p className="text-sm text-warning">{VERIFY_TO_CHANGE_TASKS}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          label="Filter cards"
          placeholder="Filter cards…"
          value={url.search}
          onValueChange={(value) => {
            updateUrl({ search: value });
          }}
          className="w-full sm:max-w-xs"
        />
        <div className="w-full sm:w-auto">
          <Select
            aria-label="Assignee"
            value={url.assignee}
            placeholder="Anyone"
            options={project.members.map((m) => ({
              value: m.userId,
              label: m.userId === user?.id ? `${m.fullName} (you)` : m.fullName,
            }))}
            onChange={(event) => {
              updateUrl({ assignee: event.target.value });
            }}
          />
        </div>
        <div className="w-full sm:w-auto">
          <Select
            aria-label="Priority"
            value={url.priority}
            placeholder="All priorities"
            options={TASK_PRIORITIES.map((p) => ({ value: p, label: TASK_PRIORITY_META[p].label }))}
            onChange={(event) => {
              updateUrl({ priority: event.target.value });
            }}
          />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Switch
            id={cancelledId}
            checked={url.cancelled === 'true'}
            onCheckedChange={(checked) => {
              updateUrl({ cancelled: checked ? 'true' : '' });
            }}
          />
          <label htmlFor={cancelledId} className="text-sm">
            Show cancelled
          </label>
        </div>
      </div>
      <KanbanBoard
        project={project}
        filters={{ search, priority: url.priority, assignee: url.assignee }}
        showCancelled={url.cancelled === 'true'}
      />
    </div>
  );
}
