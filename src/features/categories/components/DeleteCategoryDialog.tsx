import { getErrorMessage } from '@/api/apiError';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { useToast } from '@/contexts/toast';
import { useTasks } from '@/features/tasks';
import { type Category } from '@/types/api';

import { useDeleteCategory } from '../hooks/useCategories';

function usageText(count: number | undefined): string {
  if (count === undefined) return 'Checking which tasks use it…';
  if (count === 0) return 'No tasks use it.';
  return `${count} ${count === 1 ? 'task uses' : 'tasks use'} it; ${count === 1 ? 'it keeps' : 'they keep'} existing without a category.`;
}

/**
 * Confirms deleting a category and says what happens to its tasks (the backend keeps them and clears
 * their category: FK ON DELETE SET NULL). The count comes from GET /api/tasks?CategoryId=…&PageSize=1;
 * only Admins can delete, and Admins see every task, so the count is complete.
 */
export function DeleteCategoryDialog({
  category,
  onClose,
}: {
  category: Category;
  onClose: () => void;
}) {
  const toast = useToast();
  const remove = useDeleteCategory();
  const usage = useTasks({ CategoryId: category.id, PageSize: 1 });

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Delete "${category.name}"?`}
      description={`${usageText(usage.data?.totalCount)} This can't be undone.`}
      confirmLabel="Delete category"
      onConfirm={async () => {
        try {
          await remove.mutateAsync(category.id);
          toast.success('Category deleted', `"${category.name}" was removed.`);
        } catch (error) {
          toast.error('Could not delete the category', getErrorMessage(error));
          throw error; // keeps the dialog open
        }
      }}
    />
  );
}
