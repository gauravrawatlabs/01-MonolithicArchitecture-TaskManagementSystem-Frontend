import { Banner } from '@/components/feedback/Banner';

/**
 * Form-level error (e.g. "Invalid email or password.", network failure): shown above the form
 * and announced immediately (role="alert" from the danger Banner).
 */
export function FormErrorSummary({
  message,
  title = "We couldn't complete that",
}: {
  message?: string;
  title?: string;
}) {
  if (!message) return null;
  return (
    <Banner variant="danger" title={title} className="mb-4">
      {message}
    </Banner>
  );
}
