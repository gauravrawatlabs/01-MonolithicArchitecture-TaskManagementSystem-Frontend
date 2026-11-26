import * as RadixTooltip from '@radix-ui/react-tooltip';
import { type ReactElement, type ReactNode } from 'react';

export interface TooltipProps {
  content: ReactNode;
  /** A single focusable element (button, link). Tooltips also show on keyboard focus. */
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Short helper text on hover AND keyboard focus. Never put essential information or
 * interactive content in a tooltip: touch users can't hover.
 */
export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            className="z-50 max-w-64 rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-md dark:bg-gray-100 dark:text-gray-900"
          >
            {content}
            <RadixTooltip.Arrow className="fill-gray-900 dark:fill-gray-100" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
