/**
 * Public API of the tasks feature: what OTHER features may use. Pages are not exported here;
 * the router imports them directly. Only LEAF modules are exported (nothing that imports the projects
 * feature), because projects imports this file: see docs/11 §3.1.
 */
export { DueDate } from './components/DueDate';
export { PriorityBadge } from './components/PriorityBadge';
export { StatusBadge } from './components/StatusBadge';
export { taskKeys, tasksApi } from './api/tasksApi';
export { useTasks } from './hooks/useTasks';
export {
  allowedMoves,
  isClosed,
  moveLabel,
  taskPermissions,
  type TaskPermissions,
  VERIFY_TO_CHANGE_TASKS,
} from './taskRules';
