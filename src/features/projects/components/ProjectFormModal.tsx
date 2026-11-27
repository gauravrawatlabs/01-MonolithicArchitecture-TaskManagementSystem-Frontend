import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Textarea } from '@/components/common/Textarea';
import { FormErrorSummary } from '@/components/forms/FormErrorSummary';
import { FormField } from '@/components/forms/FormField';
import { useToast } from '@/contexts/toast';
import { type ProjectDetails, type ProjectSummary } from '@/types/api';
import { applyServerErrors } from '@/utils/formErrors';

import { useCreateProject, useUpdateProject } from '../hooks/useProjects';
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_NAME_MAX,
  projectSchema,
  type ProjectFormValues,
  toProjectRequest,
} from '../schemas/projectSchema';

export interface ProjectFormModalProps {
  /** Edit this project; omit to create one (the creator becomes its owner). */
  project?: Pick<
    ProjectSummary | ProjectDetails,
    'id' | 'name' | 'description' | 'startDate' | 'endDate'
  >;
  onClose: () => void;
  /** Called with the saved project (e.g. to open it after creating). */
  onSaved?: (project: ProjectDetails) => void;
}

/** Create / edit a project. Dates are calendar dates (<input type="date"> gives "yyyy-MM-dd"). */
export function ProjectFormModal({ project, onClose, onSaved }: ProjectFormModalProps) {
  const isEdit = project !== undefined;
  const formId = useId();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  const create = useCreateProject();
  const update = useUpdateProject();

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? '',
      description: project?.description ?? '',
      startDate: project?.startDate ?? '',
      endDate: project?.endDate ?? '',
    },
  });
  const description = useWatch({ control, name: 'description' });
  const { ref: nameFieldRef, ...nameField } = register('name');

  const submit = handleSubmit(async (values) => {
    const body = toProjectRequest(values);
    try {
      const saved = isEdit
        ? await update.mutateAsync({ id: project.id, body })
        : await create.mutateAsync(body);
      toast.success(isEdit ? 'Project updated' : 'Project created', `"${saved.name}" was saved.`);
      onClose();
      onSaved?.(saved);
    } catch (error) {
      applyServerErrors(setError, error, {
        fields: ['name', 'description', 'startDate', 'endDate'],
        statusToField: { 409: 'name' },
      });
    }
  });

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={isEdit ? 'Edit project' : 'New project'}
      description={isEdit ? undefined : 'You become the owner and can then add members and tasks.'}
      initialFocusRef={nameRef}
      dismissible={!isSubmitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="grid gap-4">
        <FormErrorSummary message={errors.root?.server?.message} />
        <FormField
          label="Name"
          required
          error={errors.name?.message}
          hint={`Up to ${PROJECT_NAME_MAX} characters, unique among the owner's projects.`}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              {...nameField}
              ref={(element) => {
                nameFieldRef(element);
                nameRef.current = element;
              }}
              maxLength={PROJECT_NAME_MAX}
              autoComplete="off"
            />
          )}
        </FormField>
        <FormField
          label="Description"
          error={errors.description?.message}
          hint={`${description.length} / ${PROJECT_DESCRIPTION_MAX}`}
        >
          {(controlProps) => (
            <Textarea
              {...controlProps}
              {...register('description')}
              rows={4}
              maxLength={PROJECT_DESCRIPTION_MAX}
            />
          )}
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Start date" error={errors.startDate?.message}>
            {(controlProps) => <Input {...controlProps} type="date" {...register('startDate')} />}
          </FormField>
          <FormField
            label="End date"
            error={errors.endDate?.message}
            hint="On or after the start date."
          >
            {(controlProps) => <Input {...controlProps} type="date" {...register('endDate')} />}
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
