import { type ComponentProps } from 'react';

import { cn } from '@/utils/cn';

import { fieldClassName } from './Input';

export function Textarea({ className, rows = 4, ...props }: ComponentProps<'textarea'>) {
  return <textarea rows={rows} className={cn(fieldClassName, 'py-2', className)} {...props} />;
}
