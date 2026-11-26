import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  TASK_PRIORITIES,
  TASK_PRIORITY_META,
  TASK_STATUSES,
  TASK_STATUS_META,
} from '@/constants/taskMeta';
import { PriorityBadge, StatusBadge } from '@/features/tasks';

describe('task metadata', () => {
  it('lists statuses in workflow (Kanban column) order', () => {
    expect(TASK_STATUSES).toEqual(['Todo', 'InProgress', 'InReview', 'Done', 'Cancelled']);
  });

  it('lists priorities from least to most urgent, with increasing rank', () => {
    expect(TASK_PRIORITIES).toEqual(['Low', 'Medium', 'High', 'Critical']);
    const ranks = TASK_PRIORITIES.map((priority) => TASK_PRIORITY_META[priority].rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('gives every status a unique human-readable label', () => {
    const labels = TASK_STATUSES.map((status) => TASK_STATUS_META[status].label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('StatusBadge and PriorityBadge', () => {
  it.each(TASK_STATUSES)(
    'shows the text label for status %s (colour is never the only signal)',
    (status) => {
      render(<StatusBadge status={status} />);
      expect(screen.getByText(TASK_STATUS_META[status].label)).toBeInTheDocument();
    },
  );

  it.each(TASK_PRIORITIES)('shows the text label for priority %s', (priority) => {
    render(<PriorityBadge priority={priority} />);
    expect(screen.getByText(TASK_PRIORITY_META[priority].label)).toBeInTheDocument();
  });
});
