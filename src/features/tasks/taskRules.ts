import { hasRole, isEmailVerified } from '@/features/auth';
import { type ProjectDetails, type Task, type TaskItemStatus, type UserProfile } from '@/types/api';

/**
 * The backend's status state machine (TaskStatusWorkflow), mirrored so the UI only OFFERS valid moves:
 *
 *   Todo ⇄ InProgress ⇄ InReview → Done
 *   Todo / InProgress / InReview → Cancelled
 *   Done → InProgress      (reopen,  owner/Admin only)
 *   Cancelled → Todo       (restore, owner/Admin only)
 *
 * `ownerOnly` marks the transitions that need project-owner rights. The API still decides (409 / 403).
 */
const TRANSITIONS: Record<TaskItemStatus, readonly { to: TaskItemStatus; ownerOnly: boolean }[]> = {
  Todo: [
    { to: 'InProgress', ownerOnly: false },
    { to: 'Cancelled', ownerOnly: false },
  ],
  InProgress: [
    { to: 'Todo', ownerOnly: false },
    { to: 'InReview', ownerOnly: false },
    { to: 'Cancelled', ownerOnly: false },
  ],
  InReview: [
    { to: 'InProgress', ownerOnly: false },
    { to: 'Done', ownerOnly: false },
    { to: 'Cancelled', ownerOnly: false },
  ],
  Done: [{ to: 'InProgress', ownerOnly: true }],
  Cancelled: [{ to: 'Todo', ownerOnly: true }],
};

export function nextStatuses(from: TaskItemStatus) {
  return TRANSITIONS[from];
}

/** Done and Cancelled are "closed" (never overdue). */
export function isClosed(status: TaskItemStatus): boolean {
  return status === 'Done' || status === 'Cancelled';
}

export interface TaskPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canChangeStatus: boolean;
  /** Reopen (Done → InProgress) and restore (Cancelled → Todo). */
  canReopen: boolean;
}

const NONE: TaskPermissions = {
  canEdit: false,
  canDelete: false,
  canAssign: false,
  canChangeStatus: false,
  canReopen: false,
};

/**
 * Backend TaskAuthorizationHandler, for the UI (the API decides):
 *
 *   Operation      Admin  ProjectOwner  Creator  Assignee  OtherMember
 *   Update/Delete    ✔        ✔           ✔        ✘          ✘
 *   Assign           ✔        ✔           ✘        ✘          ✘
 *   ChangeStatus     ✔        ✔           ✔        ✔          ✘
 *   Reopen           ✔        ✔           ✘        ✘          ✘
 *
 * Before any of that, EVERY task write requires a verified email (policy EmailVerified on the controller,
 * Admins included). Membership comes next: a creator/assignee who left the project has no rights.
 * `project` is needed for owner and membership; while it's unknown (loading) only Admins get rights,
 * so the UI never over-promises.
 */
export function taskPermissions(
  user: UserProfile | null,
  task: Pick<Task, 'createdById' | 'assignedToId'>,
  project: Pick<ProjectDetails, 'ownerId' | 'members'> | undefined,
): TaskPermissions {
  if (!user || !isEmailVerified(user)) return NONE;
  if (hasRole(user, 'Admin')) {
    return {
      canEdit: true,
      canDelete: true,
      canAssign: true,
      canChangeStatus: true,
      canReopen: true,
    };
  }
  if (!project) return NONE;
  const isOwner = project.ownerId === user.id;
  const isMember = isOwner || project.members.some((member) => member.userId === user.id);
  if (!isMember) return NONE;
  const isCreator = task.createdById === user.id;
  const isAssignee = task.assignedToId === user.id;
  return {
    canEdit: isOwner || isCreator,
    canDelete: isOwner || isCreator,
    canAssign: isOwner,
    canChangeStatus: isOwner || isCreator || isAssignee,
    canReopen: isOwner,
  };
}

/** The moves this user may make from the task's current status. */
export function allowedMoves(
  status: TaskItemStatus,
  permissions: TaskPermissions,
): TaskItemStatus[] {
  if (!permissions.canChangeStatus) return [];
  return nextStatuses(status)
    .filter((move) => !move.ownerOnly || permissions.canReopen)
    .map((move) => move.to);
}

/** Verb for a status move, e.g. "Start", "Send to review", "Reopen". */
export function moveLabel(from: TaskItemStatus, to: TaskItemStatus): string {
  if (to === 'Cancelled') return 'Cancel task';
  if (from === 'Done') return 'Reopen';
  if (from === 'Cancelled') return 'Restore';
  if (to === 'InProgress') return from === 'Todo' ? 'Start' : 'Back to in progress';
  if (to === 'InReview') return 'Send to review';
  if (to === 'Done') return 'Mark done';
  return 'Back to to do';
}

/** Creating a task: any member of the project, with a verified email (the API checks membership). */
export function canCreateTasks(user: UserProfile | null): boolean {
  return isEmailVerified(user);
}

/** Shown wherever task actions are missing because the email isn't verified yet. */
export const VERIFY_TO_CHANGE_TASKS = 'Verify your email address to create or change tasks.';
