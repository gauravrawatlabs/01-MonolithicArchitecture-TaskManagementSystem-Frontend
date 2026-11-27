import { UserMinus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { getErrorMessage } from '@/api/apiError';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { IconButton } from '@/components/common/IconButton';
import { DataTable, type DataTableColumn } from '@/components/tables/DataTable';
import { useToast } from '@/contexts/toast';
import { canLookupUsers, useAuth } from '@/features/auth';
import { type ProjectMember } from '@/types/api';
import { formatDate } from '@/utils/dates';

import { MemberPicker } from '../components/MemberPicker';
import { RemoveMemberDialog } from '../components/RemoveMemberDialog';
import { useAddProjectMember } from '../hooks/useProjects';
import { useProjectContext } from '../projectContext';

/**
 * /projects/:id/members. Everyone in the project sees the list (owner first); the owner or an Admin adds
 * and removes members. Finding users needs the lookup permission (verified Admin or Manager).
 */
export function ProjectMembersPage() {
  const { project, canManage } = useProjectContext();
  const { user } = useAuth();
  const toast = useToast();
  const add = useAddProjectMember(project.id);
  const [removing, setRemoving] = useState<ProjectMember | null>(null);
  const memberIds = useMemo(
    () => new Set(project.members.map((member) => member.userId)),
    [project.members],
  );
  const canSearch = canLookupUsers(user);

  const columns: DataTableColumn<ProjectMember>[] = [
    {
      id: 'Name',
      header: 'Member',
      cell: (member) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={member.fullName} decorative />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {member.fullName}
              {member.userId === user?.id ? (
                <span className="text-muted-foreground"> (you)</span>
              ) : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'Role',
      header: 'Role',
      cell: (member) =>
        member.memberRole === 'Owner' ? (
          <Badge variant="primary">Owner</Badge>
        ) : (
          <Badge>Member</Badge>
        ),
    },
    {
      id: 'Joined',
      header: 'Joined',
      hideBelow: 'md',
      className: 'whitespace-nowrap',
      cell: (member) => (
        <span className="text-muted-foreground">{formatDate(member.joinedAtUtc)}</span>
      ),
    },
  ];
  if (canManage) {
    columns.push({
      id: 'Actions',
      header: 'Actions',
      className: 'w-12 text-right',
      // The owner can't be removed (backend 422), so no button is offered.
      cell: (member) =>
        member.memberRole === 'Owner' ? null : (
          <IconButton
            label={`Remove ${member.fullName}`}
            icon={<UserMinus />}
            size="sm"
            onClick={() => {
              setRemoving(member);
            }}
          />
        ),
    });
  }

  return (
    <div className="grid gap-6">
      {canManage ? (
        <Card>
          <CardHeader
            title="Add members"
            description="Members can see the project and its tasks, and can be assigned tasks."
          />
          <CardContent>
            {canSearch ? (
              <MemberPicker
                memberIds={memberIds}
                disabled={add.isPending}
                onSelect={(picked) => {
                  add.mutate(picked.id, {
                    onSuccess: () => {
                      toast.success(
                        'Member added',
                        `${picked.fullName} can now see "${project.name}".`,
                      );
                    },
                    onError: (error) => {
                      toast.error('Could not add the member', getErrorMessage(error));
                    },
                  });
                }}
              />
            ) : (
              <p className="text-sm text-warning">
                Finding users requires a verified Admin or Manager account.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        caption={`Members of ${project.name}`}
        columns={columns}
        rows={project.members}
        getRowId={(member) => member.userId}
      />

      {removing ? (
        <RemoveMemberDialog
          projectId={project.id}
          projectName={project.name}
          member={removing}
          onClose={() => {
            setRemoving(null);
          }}
        />
      ) : null}
    </div>
  );
}
