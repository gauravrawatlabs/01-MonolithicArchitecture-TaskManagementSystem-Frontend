import {
  CircleCheck,
  CircleDashed,
  Circle,
  CircleSlash,
  Eye,
  Flag,
  type LucideIcon,
} from 'lucide-react';

import { type TaskItemStatus, type TaskPriority } from '@/types/api';

export interface StatusMeta {
  label: string;
  icon: LucideIcon;
  /** Badge colours (soft background + strong text), light and dark. */
  badgeClassName: string;
}

export interface PriorityMeta {
  label: string;
  icon: LucideIcon;
  badgeClassName: string;
  /** Sort rank: higher = more urgent. */
  rank: number;
}

/**
 * Display metadata for every task status. Typed as Record<TaskItemStatus, …>, so adding a status
 * in the backend (and regenerating types) fails the build here until it gets a label and colour.
 */
export const TASK_STATUS_META: Record<TaskItemStatus, StatusMeta> = {
  Todo: {
    label: 'To do',
    icon: Circle,
    badgeClassName: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
  },
  InProgress: {
    label: 'In progress',
    icon: CircleDashed,
    badgeClassName: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
  },
  InReview: {
    label: 'In review',
    icon: Eye,
    badgeClassName: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300',
  },
  Done: {
    label: 'Done',
    icon: CircleCheck,
    badgeClassName: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300',
  },
  Cancelled: {
    label: 'Cancelled',
    icon: CircleSlash,
    badgeClassName: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400',
  },
};

export const TASK_PRIORITY_META: Record<TaskPriority, PriorityMeta> = {
  Low: {
    label: 'Low',
    icon: Flag,
    rank: 1,
    badgeClassName: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
  },
  Medium: {
    label: 'Medium',
    icon: Flag,
    rank: 2,
    badgeClassName: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300',
  },
  High: {
    label: 'High',
    icon: Flag,
    rank: 3,
    badgeClassName: 'bg-orange-100 text-orange-900 dark:bg-orange-500/20 dark:text-orange-300',
  },
  Critical: {
    label: 'Critical',
    icon: Flag,
    rank: 4,
    badgeClassName: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
  },
};

/** Statuses in workflow order (also the Kanban column order). */
export const TASK_STATUSES = Object.keys(TASK_STATUS_META) as TaskItemStatus[];

/** Priorities from least to most urgent. */
export const TASK_PRIORITIES = Object.keys(TASK_PRIORITY_META) as TaskPriority[];
