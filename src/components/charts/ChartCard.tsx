import { BarChart3, Table2 } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';

import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { cn } from '@/utils/cn';

export interface ChartTable {
  columns: readonly [string, string];
  rows: readonly (readonly [string, string | number])[];
}

export interface ChartCardProps {
  title: string;
  description?: ReactNode;
  /** The chart itself. */
  children: ReactNode;
  /** The same data as a table: every value stays reachable without hover or sight (dataviz rule). */
  table: ChartTable;
  className?: string;
}

/** A card holding one chart, with a Chart / Table switch. */
export function ChartCard({ title, description, children, table, className }: ChartCardProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const captionId = useId();

  const toggle = (
    <div
      role="group"
      aria-label={`${title} view`}
      className="inline-flex rounded-lg border bg-surface-muted p-0.5"
    >
      {(
        [
          ['chart', 'Chart', BarChart3],
          ['table', 'Table', Table2],
        ] as const
      ).map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => {
            setView(value);
          }}
          className={cn(
            'inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium',
            view === value
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon aria-hidden="true" className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader title={title} description={description} action={toggle} />
      <CardContent>
        {view === 'chart' ? (
          children
        ) : (
          <table className="w-full text-sm" aria-describedby={captionId}>
            <caption id={captionId} className="sr-only">
              {title}
            </caption>
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="py-2 font-medium">
                  {table.columns[0]}
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  {table.columns[1]}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {table.rows.map(([label, value]) => (
                <tr key={label}>
                  <th scope="row" className="py-2 text-left font-normal text-foreground">
                    {label}
                  </th>
                  <td className="py-2 text-right text-foreground">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
