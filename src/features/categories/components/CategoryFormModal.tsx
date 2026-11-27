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
import { type Category } from '@/types/api';
import { applyServerErrors } from '@/utils/formErrors';

import { useCreateCategory, useUpdateCategory } from '../hooks/useCategories';
import {
  CATEGORY_DESCRIPTION_MAX,
  CATEGORY_NAME_MAX,
  categorySchema,
  type CategoryFormValues,
  toCategoryRequest,
} from '../schemas/categorySchema';

export interface CategoryFormModalProps {
  /** Edit this category; omit to create a new one. */
  category?: Category;
  onClose: () => void;
}

/**
 * Create / edit a category in a modal. Mounted only while open, so every opening starts from fresh
 * form state. While saving it can't be dismissed (no half-finished requests behind a closed dialog).
 */
export function CategoryFormModal({ category, onClose }: CategoryFormModalProps) {
  const isEdit = category !== undefined;
  const formId = useId();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  const create = useCreateCategory();
  const update = useUpdateCategory();

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? '', description: category?.description ?? '' },
  });
  const description = useWatch({ control, name: 'description' });
  const { ref: nameFieldRef, ...nameField } = register('name');

  const submit = handleSubmit(async (values) => {
    const body = toCategoryRequest(values);
    try {
      if (isEdit) {
        await update.mutateAsync({ id: category.id, body });
        toast.success('Category updated', `"${body.name}" was saved.`);
      } else {
        await create.mutateAsync(body);
        toast.success('Category created', `"${body.name}" is ready to use.`);
      }
      onClose();
    } catch (error) {
      applyServerErrors(setError, error, {
        fields: ['name', 'description'],
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
      title={isEdit ? 'Edit category' : 'New category'}
      description="Categories label tasks across all projects, e.g. Bug or Feature."
      initialFocusRef={nameRef}
      dismissible={!isSubmitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create category'}
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
          hint={`Up to ${CATEGORY_NAME_MAX} characters. Must be unique.`}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              {...nameField}
              ref={(element) => {
                nameFieldRef(element);
                nameRef.current = element;
              }}
              maxLength={CATEGORY_NAME_MAX}
              autoComplete="off"
            />
          )}
        </FormField>
        <FormField
          label="Description"
          error={errors.description?.message}
          hint={`${description.length} / ${CATEGORY_DESCRIPTION_MAX}`}
        >
          {(controlProps) => (
            <Textarea
              {...controlProps}
              {...register('description')}
              rows={3}
              maxLength={CATEGORY_DESCRIPTION_MAX}
            />
          )}
        </FormField>
      </form>
    </Modal>
  );
}
