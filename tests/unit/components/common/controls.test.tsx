import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Avatar, AvatarGroup } from '@/components/common/Avatar';
import { Checkbox } from '@/components/common/Checkbox';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Select } from '@/components/common/Select';
import { Switch } from '@/components/common/Switch';

describe('Select', () => {
  const options = [
    { value: 'Low', label: 'Low' },
    { value: 'High', label: 'High' },
  ];

  it('renders a placeholder option with an empty value and lets the user choose', async () => {
    render(<Select aria-label="Priority" placeholder="All priorities" options={options} />);
    const select = screen.getByRole('combobox', { name: 'Priority' });

    expect(select).toHaveValue('');
    await userEvent.selectOptions(select, 'High');
    expect(select).toHaveValue('High');
  });
});

describe('Checkbox', () => {
  it('toggles when its label is clicked and is described by its description', async () => {
    render(<Checkbox label="Only overdue" description="Past due and still open." />);
    const checkbox = screen.getByRole('checkbox', { name: 'Only overdue' });

    await userEvent.click(screen.getByText('Only overdue'));

    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveAccessibleDescription('Past due and still open.');
  });
});

describe('Switch', () => {
  function ControlledSwitch() {
    const [checked, setChecked] = useState(false);
    return <Switch aria-label="Compact mode" checked={checked} onCheckedChange={setChecked} />;
  }

  it('is announced as a switch and toggles aria-checked with mouse and keyboard', async () => {
    render(<ControlledSwitch />);
    const control = screen.getByRole('switch', { name: 'Compact mode' });

    expect(control).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(control);
    expect(control).toHaveAttribute('aria-checked', 'true');

    control.focus();
    await userEvent.keyboard(' ');
    expect(control).toHaveAttribute('aria-checked', 'false');
  });
});

describe('Avatar', () => {
  it('shows initials but exposes the full name to assistive technology', () => {
    render(<Avatar name="Jane Doe" />);
    const avatar = screen.getByRole('img', { name: 'Jane Doe' });
    expect(avatar).toHaveTextContent('JD');
  });

  it('AvatarGroup shows the first N avatars and a "+N more" counter', () => {
    render(<AvatarGroup names={['A One', 'B Two', 'C Three', 'D Four', 'E Five']} max={3} />);

    expect(screen.getAllByRole('img')).toHaveLength(4);
    expect(screen.getByRole('img', { name: '2 more' })).toHaveTextContent('+2');
  });
});

describe('ProgressBar', () => {
  it('exposes progress semantics with a readable value', () => {
    render(<ProgressBar value={33.333} label="Website progress" showValue />);
    const bar = screen.getByRole('progressbar', { name: 'Website progress' });

    expect(bar).toHaveAttribute('aria-valuenow', '33.333');
    expect(bar).toHaveAttribute('aria-valuetext', '33.3%');
    expect(screen.getByText('33.3%')).toBeInTheDocument();
  });

  it.each([
    [-10, '0'],
    [150, '100'],
    [Number.NaN, '0'],
  ])('clamps %s to %s', (value, expected) => {
    render(<ProgressBar value={value} label="Progress" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', expected);
  });
});
