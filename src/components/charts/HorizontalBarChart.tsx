import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { formatCount } from '@/utils/numbers';

export interface BarDatum {
  label: string;
  value: number;
}

export interface HorizontalBarChartProps {
  data: readonly BarDatum[];
  /** Noun for the tooltip, e.g. "tasks". */
  unit: string;
}

const ROW_HEIGHT = 36;

/**
 * One series of horizontal bars in a single hue (dataviz: comparing amounts of ordered parts →
 * bars on one baseline, not a donut). Marks: ≤24 px thick, 4 px rounded data-end, square at the
 * baseline; value at the tip in text colour; no gridlines (every bar is labelled); no legend (one
 * series: the card title names it). Recharts' accessibility layer (on by default) makes the chart
 * focusable: arrow keys move the tooltip from bar to bar.
 */
export function HorizontalBarChart({ data, unit }: HorizontalBarChartProps) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const max = Math.max(1, ...data.map((datum) => datum.value));

  return (
    <div style={{ height: data.length * ROW_HEIGHT + 8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={[...data]}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 0 }}
        >
          <XAxis type="number" hide domain={[0, max]} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={92}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-muted)' }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              const datum = payload[0]?.payload as BarDatum | undefined;
              if (!active || !datum) return null;
              return (
                <div className="rounded-lg border bg-surface px-3 py-2 text-sm shadow-md">
                  <span className="font-semibold text-foreground">{formatCount(datum.value)}</span>{' '}
                  <span className="text-muted-foreground">
                    {unit} · {datum.label}
                  </span>
                </div>
              );
            }}
          />
          <Bar
            dataKey="value"
            fill="var(--color-primary)"
            barSize={20}
            radius={[0, 4, 4, 0]}
            isAnimationActive={!reduceMotion}
            // Recharts draws the value labels only after the animation ends (default 1.5 s): keep it short.
            animationDuration={400}
          >
            <LabelList
              dataKey="value"
              position="right"
              fill="var(--color-foreground)"
              fontSize={12}
              formatter={(value: unknown) => (typeof value === 'number' ? formatCount(value) : '')}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
