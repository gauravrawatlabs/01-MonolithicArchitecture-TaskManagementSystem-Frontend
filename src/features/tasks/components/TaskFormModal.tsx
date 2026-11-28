import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { getErrorMessage } from '@/api/apiError';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Select } from '@/components/common/Select';
import { Textarea } from '@/components/common/Textarea';
import { FormErrorSummary } from '@/components/forms/FormErrorSummary';
import { FormField } from '@/components/forms/FormField';
import { TASK_PRIORITIES, TASK_PRIORITY_META } from '@/constants/taskMeta';
import { useToast } from '@/contexts/toast';
import { useAuth } from '@/features/auth';
import { useCategories } from '@/features/categories';
import { useProject, useProjects } from '@/features/projects';
import { type Task } from '@/types/api';
import { applyServerErrors } from '@/utils/formErrors';

import { utcToLocalInput } from '../dueDates';
import { useAssignTask, useCreateTask, useUpdateTask } from '../hooks/useTask';
import {
  createTaskSchema,
  TASK_DESCRIPTION_MAX,
  TASK_TITLE_MAX,
  type TaskFormValues,
  toCreateRequest,
  toUpdateRequest,
} from '../schemas/taskSchema';
import { taskPermissions } from '../taskRules';

export interface TaskFormModalProps {
  /** Edit this task; omit to create one. */
  task?: Task;
  /** Create inside this project (the project field is then fixed). */
  projectId?: number;
  onClose: () => void;
  onSaved?: (task: Task) => void;
}

/**
 * Create / edit a task. The assignee can be chosen while CREATING by whoever may assign in that project
 * (owner/Admin): the API has no assignee in the create request, so it's a second call (PATCH …/assignee).
 * When editing, assignment is done on the task page.
 */
export function TaskFormModal({ task, projectId, onClose, onSaved }: TaskFormModalProps) {
  const isEdit = task !== undefined;
  const formId = useId();
  const titleRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  const { user } = useAuth();
  const create = useCreateTask();
  const update = useUpdateTask();
  const assign = useAssignTask();
  const categories = useCategories();
  // Projects the user can see (any member may create tasks). 100 = the API's page-size limit.
  const projects = useProjects({ SortBy: 'Name', SortDirection: 'Asc', Page: 1, PageSize: 100 });

  const originalDueUtc = task?.dueDateUtc ?? null;
  const projectEnds = useMemo(
    () => new Map((projects.data?.items ?? []).map((p) => [p.id, p.endDate])),
    [projects.data],
  );
  const schema = useMemo(
    () =>
      createTaskSchema({
        now: () => new Date(),
        originalDueUtc,
        projectEndDate: (id) => projectEnds.get(id),
      }),
    [originalDueUtc, projectEnds],
  );

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: String(task?.projectId ?? projectId ?? ''),
      title: task?.title ?? '',
      description: task?.description ?? '',
      priority: task?.priority ?? 'Medium',
      categoryId: task?.categoryId ? String(task.categoryId) : '',
      dueDate: utcToLocalInput(task?.dueDateUtc),
      assigneeId: '',
    },
  });
  const [description, selectedProjectId] = useWatch({
    control,
    name: ['description', 'projectId'],
  });
  const selectedProject = useProject(Number(selectedProjectId));
  const canAssign =
    !isEdit &&
    taskPermissions(user, { createdById: user?.id ?? '', assignedToId: null }, selectedProject.data)
      .canAssign;
  const { ref: titleFieldRef, ...titleField } = register('title');

  const submit = handleSubmit(async (values) => {
    try {
      let saved = isEdit
        ? await update.mutateAsync({ id: task.id, body: toUpdateRequest(values, originalDueUtc) })
        : await create.mutateAsync(toCreateRequest(values));
      if (!isEdit && values.assigneeId) {
        try {
          saved = await assign.mutateAsync({ id: saved.id, assignedToId: values.assigneeId });
        } catch (error) {
          // The task EXISTS; only the assignment failed. Say so instead of pretending nothing was saved.
          toast.error('Task created, but not assigned', getErrorMessage(error));
        }
      }
      toast.success(isEdit ? 'Task updated' : 'Task created', `"${saved.title}" was saved.`);
      onClose();
      onSaved?.(saved);
    } catch (error) {
      applyServerErrors(setError, error, {
        fields: ['projectId', 'title', 'description', 'priority', 'categoryId', 'dueDate'],
        // The API names the field dueDateUtc; 422 business rules (category gone, due after project end)
        // have no field and appear in the summary at the top.
        fieldAliases: { dueDateUtc: 'dueDate' },
      });
    }
  });

  const projectOptions = (projects.data?.items ?? []).map((p) => ({
    value: String(p.id),
    label: p.name,
  }));
  const memberOptions = (selectedProject.data?.members ?? []).map((m) => ({
    value: m.userId,
    label: m.userId === user?.id ? `${m.fullName} (you)` : m.fullName,
  }));

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={isEdit ? 'Edit task' : 'New task'}
      initialFocusRef={titleRef}
      dismissible={!isSubmitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create task'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="grid gap-4">
        <FormErrorSummary message={errors.root?.server?.message} />
        <FormField label="Project" required error={errors.projectId?.message}>
          {(controlProps) => (
            <Select
              {...controlProps}
              {...register('projectId')}
              options={projectOptions}
              placeholder={projects.isPending ? 'Loading projects…' : 'Choose a project'}
              disabled={isEdit || projectId !== undefined}
            />
          )}
        </FormField>
        <FormField label="Title" required error={errors.title?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              {...titleField}
              ref={(element) => {
                titleFieldRef(element);
                titleRef.current = element;
              }}
              maxLength={TASK_TITLE_MAX}
              autoComplete="off"
            />
          )}
        </FormField>
        <FormField
          label="Description"
          error={errors.description?.message}
          hint={`${description.length} / ${TASK_DESCRIPTION_MAX}`}
        >
          {(controlProps) => (
            <Textarea
              {...controlProps}
              {...register('description')}
              rows={4}
              maxLength={TASK_DESCRIPTION_MAX}
            />
          )}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Priority" error={errors.priority?.message}>
            {(controlProps) => (
              <Select
                {...controlProps}
                {...register('priority')}
                options={TASK_PRIORITIES.map((p) => ({
                  value: p,
                  label: TASK_PRIORITY_META[p].label,
                }))}
              />
            )}
          </FormField>
          <FormField label="Category" error={errors.categoryId?.message}>
            {(controlProps) => (
              <Select
                {...controlProps}
                {...register('categoryId')}
                placeholder="No category"
                options={(categories.data ?? []).map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
              />
            )}
          </FormField>
        </div>
        <FormField
          label="Due date"
          error={errors.dueDate?.message}
          hint="Your local time. Leave empty for no due date."
        >
          {(controlProps) => (
            <Input {...controlProps} type="datetime-local" {...register('dueDate')} />
          )}
        </FormField>
        {canAssign ? (
          <FormField
            label="Assignee"
            error={errors.assigneeId?.message}
            hint="Only project members can be assigned."
          >
            {(controlProps) => (
              <Select
                {...controlProps}
                {...register('assigneeId')}
                placeholder="Unassigned"
                options={memberOptions}
              />
            )}
          </FormField>
        ) : null}
      </form>
    </Modal>
  );
}
