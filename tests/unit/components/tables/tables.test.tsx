import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DataTable, type DataTableColumn } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';

interface Row {
  id: number;
  title: string;
}

const columns: DataTableColumn<Row>[] = [
  { id: 'Title', header: 'Title', sortable: true, cell: (row) => row.title },
  { id: 'Id', header: 'Id', cell: (row) => `#${row.id}` },
];

const rows: Row[] = [
  { id: 1, title: 'Fix login bug' },
  { id: 2, title: 'Write docs' },
];

describe('DataTable', () => {
  it('renders a named table with one row per item', () => {
    render(<DataTable caption="Tasks" columns={columns} rows={rows} getRowId={(row) => row.id} />);

    const table = screen.getByRole('table', { name: 'Tasks' });
    expect(within(table).getAllByRole('row')).toHaveLength(3); // header + 2
    expect(within(table).getByRole('cell', { name: 'Fix login bug' })).toBeInTheDocument();
  });

  it('reports sort changes (Asc first, then Desc) and marks the sorted column with aria-sort', async () => {
    const onSortChange = vi.fn();
    const { rerender } = render(
      <DataTable
        caption="Tasks"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        onSortChange={onSortChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Title' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'Title', direction: 'Asc' });

    rerender(
      <DataTable
        caption="Tasks"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        sort={{ columnId: 'Title', direction: 'Asc' }}
        onSortChange={onSortChange}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Title' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Title' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ columnId: 'Title', direction: 'Desc' });
  });

  it('does not render sort buttons for non-sortable columns', () => {
    render(
      <DataTable
        caption="Tasks"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        onSortChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Id' })).not.toBeInTheDocument();
  });

  it('shows skeleton rows and marks the table busy while loading', () => {
    render(
      <DataTable
        caption="Tasks"
        columns={columns}
        rows={[]}
        getRowId={(row) => row.id}
        isLoading
        skeletonRows={3}
      />,
    );

    const table = screen.getByRole('table', { name: 'Tasks' });
    expect(table).toHaveAttribute('aria-busy', 'true');
    expect(within(table).getAllByRole('row')).toHaveLength(4); // header + 3 skeletons
  });

  it('shows the empty state when there are no rows', () => {
    render(
      <DataTable
        caption="Tasks"
        columns={columns}
        rows={[]}
        getRowId={(row) => row.id}
        emptyState={<p>No tasks match your filters</p>}
      />,
    );
    expect(screen.getByText('No tasks match your filters')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('summarises the visible range and marks the current page', () => {
    render(
      <Pagination
        page={2}
        pageSize={20}
        totalCount={148}
        onPageChange={vi.fn()}
        itemLabel="tasks"
      />,
    );

    expect(screen.getByText('Showing 21–40 of 148 tasks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
  });

  it('navigates with previous, next and page buttons', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} pageSize={20} totalCount={148} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await userEvent.click(screen.getByRole('button', { name: 'Page 8' }));

    expect(onPageChange.mock.calls).toEqual([[1], [3], [8]]);
  });

  it('disables previous on the first page and next on the last page', () => {
    const { rerender } = render(
      <Pagination page={1} pageSize={20} totalCount={30} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();

    rerender(<Pagination page={2} pageSize={20} totalCount={30} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('changes the page size', async () => {
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        page={1}
        pageSize={20}
        totalCount={148}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText('Per page'), '50');

    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('handles an empty list', () => {
    render(
      <Pagination page={1} pageSize={20} totalCount={0} onPageChange={vi.fn()} itemLabel="tasks" />,
    );

    expect(screen.getByText('No tasks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });
});
