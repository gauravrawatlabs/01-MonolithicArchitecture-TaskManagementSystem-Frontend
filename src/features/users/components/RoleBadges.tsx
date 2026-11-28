import { Badge } from '@/components/common/Badge';

import { knownRoles } from '../userRules';

/** The account's roles as badges, in a fixed order (Admin, Manager, User). */
export function RoleBadges({ roles }: { roles: readonly string[] }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {knownRoles(roles).map((role) => (
        <Badge
          key={role}
          variant={role === 'Admin' ? 'primary' : role === 'Manager' ? 'info' : 'neutral'}
        >
          {role}
        </Badge>
      ))}
    </span>
  );
}
