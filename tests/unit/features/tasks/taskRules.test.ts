import { describe, expect, it } from 'vitest';

import {
  allowedMoves,
  canCreateTasks,
  moveLabel,
  nextStatuses,
  taskPermissions,
} from '@/features/tasks/taskRules';

import { buildMember, buildProjectDetails } from '../../../mocks/factories/projects';
import { buildUser } from '../../../mocks/factories/users';

describe('status workflow (mirror of TaskStatusWorkflow)', () => {
  it.each([
    ['Todo', ['InProgress', 'Cancelled']],
    ['InProgress', ['Todo', 'InReview', 'Cancelled']],
    ['InReview', ['InProgress', 'Done', 'Cancelled']],
    ['Done', ['InProgress']],
    ['Cancelled', ['Todo']],
  ] as const)('%s → %o', (from, expected) => {
    expect(nextStatuses(from).map((m) => m.to)).toEqual(expected);
  });

  it('only reopen (Done → InProgress) and restore (Cancelled → Todo) need owner rights', () => {
    const ownerOnly = (['Todo', 'InProgress', 'InReview', 'Done', 'Cancelled'] as const).flatMap(
      (from) =>
        nextStatuses(from)
          .filter((m) => m.ownerOnly)
          .map((m) => `${from}→${m.to}`),
    );
    expect(ownerOnly).toEqual(['Done→InProgress', 'Cancelled→Todo']);
  });

  it('labels moves as actions', () => {
    expect(moveLabel('Todo', 'InProgress')).toBe('Start');
    expect(moveLabel('InProgress', 'InReview')).toBe('Send to review');
    expect(moveLabel('InReview', 'Done')).toBe('Mark done');
    expect(moveLabel('Done', 'InProgress')).toBe('Reopen');
    expect(moveLabel('Cancelled', 'Todo')).toBe('Restore');
    expect(moveLabel('Todo', 'Cancelled')).toBe('Cancel task');
  });
});

describe('taskPermissions (mirror of TaskAuthorizationHandler)', () => {
  const owner = buildUser({ roles: ['Manager'] });
  const creator = buildUser();
  const assignee = buildUser();
  const other = buildUser();
  const outsider = buildUser();
  const project = buildProjectDetails({
    ownerId: owner.id,
    members: [
      buildMember({ userId: owner.id, memberRole: 'Owner' }),
      buildMember({ userId: creator.id }),
      buildMember({ userId: assignee.id }),
      buildMember({ userId: other.id }),
    ],
  });
  const task = { createdById: creator.id, assignedToId: assignee.id };
  const rights = (user: typeof owner) => {
    const p = taskPermissions(user, task, project);
    return [p.canEdit, p.canDelete, p.canAssign, p.canChangeStatus, p.canReopen];
  };

  it.each([
    ['Admin', buildUser({ roles: ['Admin'] }), [true, true, true, true, true]],
    ['project owner', owner, [true, true, true, true, true]],
    ['creator', creator, [true, true, false, true, false]],
    ['assignee', assignee, [false, false, false, true, false]],
    ['other member', other, [false, false, false, false, false]],
    ['non-member', outsider, [false, false, false, false, false]],
  ])('%s', (_name, user, expected) => {
    expect(rights(user)).toEqual(expected);
  });

  it('grants NO write rights without a verified email, not even to Admins (EmailVerified policy)', () => {
    const unverifiedOwner = { ...owner, emailConfirmed: false };
    const unverifiedAdmin = buildUser({ roles: ['Admin'], emailConfirmed: false });
    expect(Object.values(taskPermissions(unverifiedOwner, task, project)).some(Boolean)).toBe(
      false,
    );
    expect(Object.values(taskPermissions(unverifiedAdmin, task, project)).some(Boolean)).toBe(
      false,
    );
    expect(canCreateTasks(unverifiedOwner)).toBe(false);
    expect(canCreateTasks(other)).toBe(true);
  });

  it('a creator who LEFT the project has no rights (membership first)', () => {
    const left = buildProjectDetails({
      ownerId: owner.id,
      members: [buildMember({ userId: owner.id })],
    });
    expect(taskPermissions(creator, task, left).canEdit).toBe(false);
  });

  it('grants nothing (except to Admins) while the project is still loading', () => {
    expect(taskPermissions(owner, task, undefined).canChangeStatus).toBe(false);
    expect(taskPermissions(buildUser({ roles: ['Admin'] }), task, undefined).canAssign).toBe(true);
  });

  it('allowedMoves hides owner-only moves from an assignee', () => {
    expect(allowedMoves('Done', taskPermissions(assignee, task, project))).toEqual([]);
    expect(allowedMoves('Done', taskPermissions(owner, task, project))).toEqual(['InProgress']);
    expect(allowedMoves('Todo', taskPermissions(other, task, project))).toEqual([]);
  });
});
