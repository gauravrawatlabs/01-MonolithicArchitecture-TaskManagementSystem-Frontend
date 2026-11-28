import { describe, expect, it } from 'vitest';

import { announce, dropState, nextColumn, shouldMove } from '@/features/board/boardDnd';
import { type TaskItemStatus } from '@/types/api';

const order: TaskItemStatus[] = ['Todo', 'InProgress', 'InReview', 'Done'];
const task = { title: 'Fix login', status: 'InProgress' as const };
const moves: TaskItemStatus[] = ['Todo', 'InReview', 'Cancelled'];

describe('board drag-and-drop decisions', () => {
  it('arrow keys jump one whole column, stopping at both ends; other keys do nothing', () => {
    expect(nextColumn(order, 'InProgress', 'ArrowRight')).toBe('InReview');
    expect(nextColumn(order, 'InProgress', 'ArrowLeft')).toBe('Todo');
    expect(nextColumn(order, 'Done', 'ArrowRight')).toBe('Done');
    expect(nextColumn(order, 'Todo', 'ArrowLeft')).toBe('Todo');
    expect(nextColumn(order, 'Todo', 'ArrowDown')).toBeNull();
  });

  it('only a drop on another, ALLOWED column changes the status (forbidden: no API call)', () => {
    expect(shouldMove(task, 'InReview', moves)).toBe(true);
    expect(shouldMove(task, 'Done', moves)).toBe(false); // workflow forbids InProgress → Done
    expect(shouldMove(task, 'InProgress', moves)).toBe(false); // same column
    expect(shouldMove(task, undefined, moves)).toBe(false); // dropped outside
  });

  it('marks columns while dragging: source, allowed, forbidden; idle when nothing is dragged', () => {
    expect(dropState(null, 'Done', moves)).toBe('idle');
    expect(dropState(task, 'InProgress', moves)).toBe('source');
    expect(dropState(task, 'InReview', moves)).toBe('allowed');
    expect(dropState(task, 'Done', moves)).toBe('forbidden');
  });

  it('announces the drag for screen readers, quiet over the starting column right after pick-up', () => {
    expect(announce.start(task, moves)).toBe(
      'Picked up Fix login from In progress. It can move to: To do, In review, Cancelled.',
    );
    expect(announce.over(task, 'InProgress', 'InProgress', moves)).toBeUndefined();
    expect(announce.over(task, 'Done', 'InProgress', moves)).toBe('Over Done: not allowed.');
    expect(announce.over(task, 'InReview', 'Done', moves)).toBe('Over In review.');
    expect(announce.over(task, 'InProgress', 'InReview', moves)).toBe(
      'Fix login is back over In progress.',
    );
    expect(announce.over(task, null, 'InReview', moves)).toBe('Fix login is not over a column.');
    expect(announce.end(task, 'InReview', moves)).toBe('Fix login moved to In review.');
    expect(announce.end(task, 'Done', moves)).toBe('Fix login stays in In progress.');
    expect(announce.cancel(task)).toBe('Moving cancelled. Fix login stays where it was.');
  });
});
