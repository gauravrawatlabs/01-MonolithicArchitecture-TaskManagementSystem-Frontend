import { useParams } from 'react-router';

import { PagePlaceholder } from '@/components/layout/PagePlaceholder';

export function TaskDetailsPage() {
  const { taskId = '' } = useParams();

  return (
    <PagePlaceholder
      title={`Task #${taskId}`}
      description="Details, assignment, status and comments."
      phase={11}
    />
  );
}
