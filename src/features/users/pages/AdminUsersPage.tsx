import { Users } from 'lucide-react';
import { Link } from 'react-router';

import { getErrorMessage, toApiError } from '@/api/apiError';
import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Select } from '@/components/common/Select';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SearchInput } from '@/components/forms/SearchInput';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type DataTableColumn } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import { ROLES } from '@/constants/roles';
import { paths } from '@/constants/routes';
import { useAuth } from '@/features/auth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useUrlState } from '@/hooks/useUrlState';
import { type UserProfile, type UserQuery, type UserSortField } from '@/types/api';
import { cn } from '@/utils/cn';
import { formatDate, formatTimeAgo } from '@/utils/dates';

import { VerifyToAdminister } from '../components/AdminOnlyNotice';
import { RoleBadges } from '../components/RoleBadges';
import { useUsers } from '../hooks/useUsers';
import { canAdministerUsers, fullName } from '../userRules';

const SORT_FIELDS: readonly UserSortField[] = ['Email', 'Name', 'CreatedAt', 'LastLogin'];
const PAGE_SIZES = [10, 20, 50, 100] as const;
/** Backend default: Asc for Email/Name, Desc (newest first) for CreatedAt/LastLogin. */
const naturalDirection = (field: UserSortField) =>
  field === 'CreatedAt' || field === 'LastLogin' ? 'Desc' : 'Asc';

/** /admin/users: every account (Admin + verified email). Search, filters, sort and paging on the server. */
export function AdminUsersPage() {
  const { user: me } = useAuth();
  const [url, updateUrl] = useUrlState({
    search: '',
    role: '',
    status: '',
    sort: 'Email',
    dir: '',
    page: '1',
    size: '20',
  });
  const search = useDebouncedValue(url.search.trim(), 300);
  const allowed = canAdministerUsers(me);

  const sortBy = SORT_FIELDS.includes(url.sort as UserSortField)
    ? (url.sort as UserSortField)
    : 'Email';
  const direction = url.dir === 'Asc' || url.dir === 'Desc' ? url.dir : naturalDirection(sortBy);
  const size = (PAGE_SIZES as readonly number[]).includes(Number(url.size)) ? Number(url.size) : 20;
  const page = Math.max(1, Math.trunc(Number(url.page)) || 1);
  const query: UserQuery = {
    Search: search || undefined,
    Role: (ROLES as readonly string[]).includes(url.role) ? url.role : undefined,
    IsActive: url.status === 'active' ? true : url.status === 'inactive' ? false : undefined,
    SortBy: sortBy,
    SortDirection: direction,
    Page: page,
    PageSize: size,
  };
  const users = useUsers(query, { enabled: allowed });
  const setFilter = (updates: Partial<typeof url>) => {
    updateUrl({ ...updates, page: '1' });
  };
  const filtered = Boolean(url.search || url.role || url.status);

  if (!allowed) {
    return (
      <>
        <PageHeader title="Users" description="Every account in the system." />
        <VerifyToAdminister />
      </>
    );
  }

  const columns: DataTableColumn<UserProfile>[] = [
    {
      id: 'Name',
      header: 'Name',
      sortable: true,
      cell: (user) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={fullName(user)} decorative />
          <div className="min-w-0">
            <Link
              to={paths.adminUser(user.id)}
              className="font-medium text-foreground hover:underline"
            >
              {fullName(user)}
            </Link>
            {user.id === me?.id ? <span className="text-muted-foreground"> (you)</span> : null}
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'Email',
      header: 'Email',
      sortable: true,
      hideBelow: 'lg',
      cell: (user) => <span className="text-muted-foreground">{user.email}</span>,
    },
    { id: 'Roles', header: 'Roles', cell: (user) => <RoleBadges roles={user.roles} /> },
    {
      id: 'Status',
      header: 'Status',
      hideBelow: 'md',
      cell: (user) => (
        <span className="inline-flex flex-wrap gap-1">
          {user.isActive ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="danger">Deactivated</Badge>
          )}
          {user.emailConfirmed ? null : <Badge variant="warning">Unverified</Badge>}
        </span>
      ),
    },
    {
      id: 'LastLogin',
      header: 'Last sign-in',
      sortable: true,
      firstSortDirection: 'Desc',
      hideBelow: 'lg',
      className: 'whitespace-nowrap',
      cell: (user) => (
        <span className="text-muted-foreground">
          {user.lastLoginAtUtc ? formatTimeAgo(user.lastLoginAtUtc) : 'Never'}
        </span>
      ),
    },
    {
      id: 'CreatedAt',
      header: 'Joined',
      sortable: true,
      firstSortDirection: 'Desc',
      hideBelow: 'lg',
      className: 'whitespace-nowrap',
      cell: (user) => (
        <span className="text-muted-foreground">{formatDate(user.createdAtUtc)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        description="Every account in the system. Open one to change its roles or status."
      />
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            label="Search users"
            placeholder="Name or email"
            value={url.search}
            onValueChange={(value) => {
              setFilter({ search: value });
            }}
            className="w-full sm:max-w-xs"
          />
          <div className="w-full sm:w-auto">
            <Select
              aria-label="Role"
              value={url.role}
              placeholder="All roles"
              options={ROLES.map((role) => ({ value: role, label: role }))}
              onChange={(event) => {
                setFilter({ role: event.target.value });
              }}
            />
          </div>
          <div className="w-full sm:w-auto">
            <Select
              aria-label="Status"
              value={url.status}
              placeholder="Active and deactivated"
              options={[
                { value: 'active', label: 'Active only' },
                { value: 'inactive', label: 'Deactivated only' },
              ]}
              onChange={(event) => {
                setFilter({ status: event.target.value });
              }}
            />
          </div>
          {filtered ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilter({ search: '', role: '', status: '' });
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        {users.isError && !users.data ? (
          <Card>
            <ErrorState
              title="We couldn't load the users"
              description={getErrorMessage(users.error)}
              correlationId={toApiError(users.error).correlationId}
              onRetry={() => void users.refetch()}
              isRetrying={users.isFetching}
            />
          </Card>
        ) : (
          <>
            <div
              className={cn(users.isPlaceholderData && 'opacity-60 transition-opacity')}
              aria-busy={users.isPlaceholderData}
            >
              <DataTable
                caption="Users"
                columns={columns}
                rows={users.data?.items ?? []}
                getRowId={(user) => user.id}
                isLoading={users.isPending}
                sort={{ columnId: sortBy, direction }}
                onSortChange={(next) => {
                  const field = next.columnId as UserSortField;
                  setFilter({
                    sort: field,
                    dir: next.direction === naturalDirection(field) ? '' : next.direction,
                  });
                }}
                emptyState={
                  <EmptyState
                    icon={Users}
                    title="No users match these filters"
                    description="Try a different search or clear the filters."
                  />
                }
              />
            </div>
            {users.data && users.data.totalCount > 0 ? (
              <Pagination
                page={page}
                pageSize={size}
                totalCount={users.data.totalCount}
                pageSizeOptions={PAGE_SIZES}
                itemLabel="users"
                onPageChange={(next) => {
                  updateUrl({ page: String(next) });
                }}
                onPageSizeChange={(next) => {
                  setFilter({ size: String(next) });
                }}
              />
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
