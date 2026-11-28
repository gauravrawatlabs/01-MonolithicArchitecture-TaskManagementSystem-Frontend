import { zodResolver } from '@hookform/resolvers/zod';
import { type KeyboardEvent, useEffect, useId, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/common/Button';
import { Textarea } from '@/components/common/Textarea';
import { FormErrorSummary } from '@/components/forms/FormErrorSummary';
import { FormField } from '@/components/forms/FormField';
import { requiredText } from '@/schemas/common';
import { applyServerErrors } from '@/utils/formErrors';

import { COMMENT_MAX } from '../commentRules';

const commentSchema = z.object({ content: requiredText('Comment', COMMENT_MAX) });
type CommentValues = z.infer<typeof commentSchema>;

export interface CommentFormProps {
  label: string;
  submitLabel: string;
  initialContent?: string;
  /** Resolve to clear the form; throw to keep it (errors are shown under the field). */
  onSubmit: (content: string) => Promise<unknown>;
  onCancel?: () => void;
  /** Move focus into the box when it appears (only right after the user chose "Edit"). */
  focusOnMount?: boolean;
}

/** Comment text box for adding and editing. Ctrl/⌘ + Enter submits (said in the hint). */
export function CommentForm({
  label,
  submitLabel,
  initialContent = '',
  onSubmit,
  onCancel,
  focusOnMount = false,
}: CommentFormProps) {
  const formId = useId();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: initialContent },
  });
  const content = useWatch({ control, name: 'content' });
  const { ref: fieldRef, ...field } = register('content');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (focusOnMount) textareaRef.current?.focus();
  }, [focusOnMount]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values.content);
      reset({ content: '' });
    } catch (error) {
      applyServerErrors(setError, error, { fields: ['content'] });
    }
  });
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form id={formId} noValidate onSubmit={submit} className="grid gap-2">
      <FormErrorSummary message={errors.root?.server?.message} />
      <FormField
        label={label}
        error={errors.content?.message}
        hint={`${content.length} / ${COMMENT_MAX} · Ctrl + Enter to send`}
      >
        {(controlProps) => (
          <Textarea
            {...controlProps}
            {...field}
            ref={(element) => {
              fieldRef(element);
              textareaRef.current = element;
            }}
            rows={3}
            maxLength={COMMENT_MAX}
            onKeyDown={onKeyDown}
          />
        )}
      </FormField>
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" size="sm" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
