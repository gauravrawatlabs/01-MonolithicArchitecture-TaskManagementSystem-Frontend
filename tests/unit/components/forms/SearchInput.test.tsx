import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { SearchInput } from '@/components/forms/SearchInput';

function Harness() {
  const [value, setValue] = useState('');
  return <SearchInput label="Search categories" value={value} onValueChange={setValue} />;
}

describe('SearchInput', () => {
  it('is a named search box with a clear button that appears only when there is text', async () => {
    render(<Harness />);
    const box = screen.getByRole('searchbox', { name: 'Search categories' });
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();

    await userEvent.type(box, 'bug');
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(box).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });
});
