/**
 * Public API of the tasks feature: what OTHER features may use. Pages are not exported here;
 * the router imports them directly so each page becomes its own lazily loaded chunk.
 */
export { PriorityBadge } from './components/PriorityBadge';
export { StatusBadge } from './components/StatusBadge';
export { taskKeys, tasksApi } from './api/tasksApi';
export { useTasks } from './hooks/useTasks';
