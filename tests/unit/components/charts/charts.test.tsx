import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListChecks } from 'lucide-react';
import { type ReactElement } from 'react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';

import { ChartCard } from '@/components/charts/ChartCard';
import { StatCard } from '@/components/common/StatCard';

describe('ChartCard', () => {
  const table = {
    columns: ['Status', 'Tasks'] as const,
    rows: [
      ['To do', 12],
      ['Done', 15],
    ] as const,
  };

  it('shows the chart first and offers the same data as a table', async () => {
    render(
      <ChartCard title="Tasks by status" table={table}>
        <p>the chart</p>
      </ChartCard>,
    );
    expect(screen.getByText('the chart')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chart' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Table' }));

    const tableElement = screen.getByRole('table', { name: 'Tasks by status' });
    expect(within(tableElement).getByRole('rowheader', { name: 'Done' })).toBeInTheDocument();
    expect(within(tableElement).getAllByRole('row')).toHaveLength(3);
    expect(screen.queryByText('the chart')).not.toBeInTheDocument();
  });
});

describe('StatCard', () => {
  function renderInRouter(ui: ReactElement) {
    const router = createMemoryRouter([{ path: '*', element: ui }]);
    return render(<RouterProvider router={router} />);
  }

  it('shows label and formatted value, and becomes one link when given a target', () => {
    renderInRouter(
      <StatCard
        label="Total tasks"
        value={12_900}
        icon={ListChecks}
        to="/tasks"
        hint="in 3 projects"
      />,
    );

    const link = screen.getByRole('link', { name: /Total tasks/ });
    expect(link).toHaveAttribute('href', '/tasks');
    expect(link).toHaveTextContent('12.9K');
    expect(link).toHaveTextContent('in 3 projects');
  });

  it('is plain content without a target', () => {
    renderInRouter(<StatCard label="Completed" value={15} icon={ListChecks} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});
