import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Input } from '@/components/common/Input';
import { FormField } from '@/components/forms/FormField';
import { PasswordInput } from '@/components/forms/PasswordInput';

describe('FormField', () => {
  it('connects the label to the control', () => {
    render(<FormField label="Title">{(control) => <Input {...control} />}</FormField>);

    expect(screen.getByRole('textbox', { name: 'Title' })).toBeInTheDocument();
  });

  it('marks required fields for assistive technology without reading the asterisk', () => {
    render(
      <FormField label="Title" required>
        {(control) => <Input {...control} />}
      </FormField>,
    );

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveAttribute('aria-required', 'true');
  });

  it('describes the control with the hint and the error, and flags it as invalid', () => {
    render(
      <FormField label="Email" hint="We never share it." error="Enter a valid email address.">
        {(control) => <Input {...control} />}
      </FormField>,
    );

    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('We never share it. Enter a valid email address.');
  });

  it('is not invalid and has no description when there is no hint or error', () => {
    render(<FormField label="Name">{(control) => <Input {...control} />}</FormField>);

    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });
});

describe('PasswordInput', () => {
  it('hides the password by default and toggles visibility without submitting the form', async () => {
    let submitted = false;
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted = true;
        }}
      >
        <FormField label="Password">
          {(control) => <PasswordInput {...control} defaultValue="Secret1!" />}
        </FormField>
      </form>,
    );
    const input = screen.getByLabelText('Password');

    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(submitted).toBe(false);
  });
});
