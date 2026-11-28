import { useState } from 'react';

import { getErrorMessage } from '@/api/apiError';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { type Role, ROLES } from '@/constants/roles';
import { useToast } from '@/contexts/toast';
import { useAuth } from '@/features/auth';
import { type UserProfile } from '@/types/api';

import { useUpdateRoles } from '../hooks/useUsers';
import { knownRoles, roleEditRules } from '../userRules';

const DESCRIPTIONS: Record<Role, string> = {
  Admin: 'Everything, including user administration and categories.',
  Manager: 'Can create projects and find users to add to them.',
  User: 'Works on the tasks of the projects they belong to.',
};

/**
 * Edits an account's roles (PUT /api/users/{id}/roles). At least one role (validator). Your own Admin role is
 * locked, with the reason as visible text (UserService refuses it with 422).
 */
export function RolesEditor({ user }: { user: UserProfile }) {
  const { user: me } = useAuth();
  const toast = useToast();
  const save = useUpdateRoles();
  const current = knownRoles(user.roles);
  const [selected, setSelected] = useState<Role[]>(current);
  const [error, setError] = useState<string | null>(null);
  const { locked } = roleEditRules(me, user);
  const changed =
    selected.length !== current.length || selected.some((role) => !current.includes(role));

  const toggle = (role: Role, on: boolean) => {
    setError(null);
    setSelected((roles) => ROLES.filter((r) => (r === role ? on : roles.includes(r))));
  };

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (selected.length === 0) {
          setError('Choose at least one role.');
          return;
        }
        save.mutate(
          { id: user.id, roles: selected },
          {
            onSuccess: (saved) => {
              setSelected(knownRoles(saved.roles));
              toast.success(
                'Roles updated',
                `${saved.firstName} ${saved.lastName}: ${knownRoles(saved.roles).join(', ')}`,
              );
            },
            onError: (failure) => {
              setError(getErrorMessage(failure));
            },
          },
        );
      }}
    >
      <fieldset className="grid gap-3" disabled={save.isPending}>
        <legend className="sr-only">Roles</legend>
        {ROLES.map((role) => (
          <div key={role}>
            <Checkbox
              label={role}
              description={DESCRIPTIONS[role]}
              checked={selected.includes(role)}
              disabled={Boolean(locked[role])}
              onChange={(event) => {
                toggle(role, event.target.checked);
              }}
            />
            {locked[role] ? (
              <p className="mt-1 ml-6.5 text-xs text-warning">{locked[role]}</p>
            ) : null}
          </div>
        ))}
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Changes reach the person's open sessions within 15 minutes (when their access token is
        renewed).
      </p>
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          disabled={!changed || save.isPending}
          onClick={() => {
            setSelected(current);
            setError(null);
          }}
        >
          Discard
        </Button>
        <Button type="submit" disabled={!changed} isLoading={save.isPending}>
          Save roles
        </Button>
      </div>
    </form>
  );
}
