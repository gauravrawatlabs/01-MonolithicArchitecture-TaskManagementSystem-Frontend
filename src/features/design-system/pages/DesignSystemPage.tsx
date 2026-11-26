import { Bomb, Ellipsis, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { type ReactNode, useMemo, useRef, useState } from 'react';

import { Avatar, AvatarGroup } from '@/components/common/Avatar';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/common/Card';
import { Checkbox } from '@/components/common/Checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/common/DropdownMenu';
import { IconButton } from '@/components/common/IconButton';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Select } from '@/components/common/Select';
import { Skeleton, SkeletonText } from '@/components/common/Skeleton';
import { Spinner } from '@/components/common/Spinner';
import { Switch } from '@/components/common/Switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/Tabs';
import { Textarea } from '@/components/common/Textarea';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Tooltip } from '@/components/common/Tooltip';
import { Banner } from '@/components/feedback/Banner';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { ErrorState } from '@/components/feedback/ErrorState';
import { FormField } from '@/components/forms/FormField';
import { PasswordInput } from '@/components/forms/PasswordInput';
import { DataTable, type DataTableColumn, type SortState } from '@/components/tables/DataTable';
import { Pagination } from '@/components/tables/Pagination';
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_META,
  TASK_STATUSES,
  TASK_STATUS_META,
} from '@/constants/taskMeta';
import { useToast } from '@/contexts/toast';
import { PriorityBadge, StatusBadge } from '@/features/tasks';
import { type TaskItemStatus, type TaskPriority } from '@/types/api';

/**
 * Living style guide: every shared component in light and dark mode. It is the quickest way to
 * review the design system, and the E2E accessibility scan runs against it.
 */
export function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary-text">Phase 4 · Design system</p>
          <h1 className="mt-1 text-2xl font-semibold">Component library</h1>
          <p className="mt-1 text-muted-foreground">
            Every shared component, in the current theme. Switch themes to check both.
          </p>
        </div>
        <ThemeToggle showLabels />
      </header>

      <ColorsSection />
      <TypographySection />
      <ButtonsSection />
      <FormsSection />
      <BadgesSection />
      <CardsSection />
      <NavigationSection />
      <OverlaysSection />
      <FeedbackSection />
      <TableSection />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`ds-${title}`} className="space-y-4">
      <h2 id={`ds-${title}`} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

const SWATCHES = [
  ['Background', 'bg-background'],
  ['Surface', 'bg-surface'],
  ['Surface muted', 'bg-surface-muted'],
  ['Border', 'bg-border'],
  ['Primary', 'bg-primary'],
  ['Primary soft', 'bg-primary-soft'],
  ['Success', 'bg-success'],
  ['Warning', 'bg-warning'],
  ['Danger', 'bg-danger'],
  ['Info', 'bg-info'],
  ['Sidebar', 'bg-sidebar'],
  ['Foreground', 'bg-foreground'],
] as const;

function ColorsSection() {
  return (
    <Section title="Colours">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {SWATCHES.map(([name, className]) => (
          <li key={name} className="overflow-hidden rounded-lg border bg-surface">
            <div className={`h-14 border-b ${className}`} />
            <p className="px-3 py-2 text-xs font-medium">{name}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function TypographySection() {
  return (
    <Section title="Typography">
      <Card>
        <CardContent className="space-y-3">
          <p className="text-3xl font-semibold">148 · Display (stat numbers)</p>
          <p className="text-2xl font-semibold">Heading 1 · Page titles</p>
          <p className="text-lg font-semibold">Heading 2 · Card and modal titles</p>
          <p>Body · The default text size for tables, forms and descriptions.</p>
          <p className="text-xs font-medium text-muted-foreground">
            Small · Badges, captions, timestamps
          </p>
          <p>
            <a
              href="#ds-Typography"
              className="font-medium text-primary-text underline-offset-4 hover:underline"
            >
              A text link
            </a>
          </p>
        </CardContent>
      </Card>
    </Section>
  );
}

function ButtonsSection() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Section title="Buttons">
      <div className="flex flex-wrap items-center gap-3">
        <Button leftIcon={<Plus aria-hidden="true" />}>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger" leftIcon={<Trash2 aria-hidden="true" />}>
          Delete
        </Button>
        <Button disabled>Disabled</Button>
        <Button
          isLoading={isLoading}
          onClick={() => {
            setIsLoading(true);
            window.setTimeout(() => {
              setIsLoading(false);
            }, 1500);
          }}
        >
          {isLoading ? 'Saving…' : 'Click to load'}
        </Button>
        <Button size="sm" variant="secondary">
          Small
        </Button>
        <Button size="lg">Large</Button>
        <IconButton label="Edit task" icon={<Pencil />} variant="secondary" />
        <IconButton label="More actions" icon={<Ellipsis />} />
      </div>
    </Section>
  );
}

function FormsSection() {
  const [notifications, setNotifications] = useState(true);

  return (
    <Section title="Forms">
      <Card>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <FormField label="Title" required hint="Max 200 characters.">
            {(control) => <Input {...control} placeholder="e.g. Fix login bug" maxLength={200} />}
          </FormField>
          <FormField label="Email" required error="Enter a valid email address.">
            {(control) => <Input {...control} type="email" defaultValue="jane@" />}
          </FormField>
          <FormField label="Password" required>
            {(control) => <PasswordInput {...control} defaultValue="Str0ng!Pass" />}
          </FormField>
          <FormField label="Priority">
            {(control) => (
              <Select
                {...control}
                defaultValue="Medium"
                options={TASK_PRIORITIES.map((value) => ({
                  value,
                  label: TASK_PRIORITY_META[value].label,
                }))}
              />
            )}
          </FormField>
          <FormField label="Status filter">
            {(control) => (
              <Select
                {...control}
                placeholder="All statuses"
                options={TASK_STATUSES.map((value) => ({
                  value,
                  label: TASK_STATUS_META[value].label,
                }))}
              />
            )}
          </FormField>
          <FormField label="Due date" hint="Must be in the future.">
            {(control) => <Input {...control} type="datetime-local" />}
          </FormField>
          <FormField label="Description" className="md:col-span-2">
            {(control) => <Textarea {...control} placeholder="Add more detail…" />}
          </FormField>
          <Checkbox
            label="Only overdue tasks"
            description="Due date passed and not done or cancelled."
          />
          <div className="flex items-center justify-between gap-4">
            <span id="ds-switch-label" className="text-sm font-medium">
              Compact mode
            </span>
            <Switch
              aria-labelledby="ds-switch-label"
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>
          <FormField label="Disabled field">
            {(control) => <Input {...control} disabled defaultValue="Read only" />}
          </FormField>
        </CardContent>
      </Card>
    </Section>
  );
}

function BadgesSection() {
  return (
    <Section title="Badges and avatars">
      <div className="flex flex-wrap gap-2">
        {(['neutral', 'primary', 'success', 'warning', 'danger', 'info'] as const).map(
          (variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ),
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {TASK_STATUSES.map((status: TaskItemStatus) => (
          <StatusBadge key={status} status={status} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {TASK_PRIORITIES.map((priority: TaskPriority) => (
          <PriorityBadge key={priority} priority={priority} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name="Jane Doe" size="xs" />
        <Avatar name="Ali Khan" size="sm" />
        <Avatar name="Maria Garcia" size="md" />
        <Avatar name="Wei Chen" size="lg" />
        <AvatarGroup names={['Jane Doe', 'Ali Khan', 'Maria Garcia', 'Wei Chen', 'Sam Lee']} />
      </div>
    </Section>
  );
}

function CardsSection() {
  return (
    <Section title="Cards and progress">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader
            title="Website Redesign"
            description="Marketing site refresh"
            headingLevel="h3"
            action={<Badge variant="success">Active</Badge>}
          />
          <CardContent className="space-y-3">
            <ProgressBar value={68} label="Website Redesign progress" showValue />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>31 / 45 tasks done</span>
              <AvatarGroup names={['Jane Doe', 'Ali Khan', 'Maria Garcia', 'Wei Chen']} size="xs" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Open tasks" headingLevel="h3" />
          <CardContent>
            <p className="text-3xl font-semibold">72</p>
            <p className="mt-1 text-sm text-muted-foreground">18 due in the next 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Card with footer" headingLevel="h3" />
          <CardContent>
            <ProgressBar value={33.3} label="Example progress" showValue />
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
            <Button size="sm">Save</Button>
          </CardFooter>
        </Card>
      </div>
    </Section>
  );
}

function NavigationSection() {
  return (
    <Section title="Tabs, menus and tooltips">
      <Card>
        <CardContent className="space-y-6">
          <Tabs defaultValue="overview">
            <TabsList aria-label="Project sections">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              Overview content. Use ← → to move between tabs.
            </TabsContent>
            <TabsContent value="tasks">Tasks content.</TabsContent>
            <TabsContent value="members">Members content.</TabsContent>
          </Tabs>
          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" leftIcon={<Ellipsis aria-hidden="true" />}>
                  Task actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Task #142</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Pencil aria-hidden="true" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem disabled>Assign (owner only)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="danger">
                  <Trash2 aria-hidden="true" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip content="Only the project owner can assign tasks">
              <Button variant="ghost">Hover or focus me</Button>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </Section>
  );
}

function OverlaysSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  return (
    <Section title="Modals, confirmations and toasts">
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => {
            setModalOpen(true);
          }}
        >
          Open modal
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            setConfirmOpen(true);
          }}
        >
          Delete project…
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            toast.success('Task created', 'Fix login bug was added to Website Redesign.');
          }}
        >
          Success toast
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            toast.error(
              'Could not move the task',
              'The workflow does not allow Done → In review.',
              '0HN7S2K9QF1M2',
            );
          }}
        >
          Error toast
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            toast.info('Session refreshed');
          }}
        >
          Info toast
        </Button>
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="New project"
        description="Projects group tasks and team members."
        initialFocusRef={nameInputRef}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              leftIcon={<FolderPlus aria-hidden="true" />}
              onClick={() => {
                setModalOpen(false);
              }}
            >
              Create project
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <FormField label="Name" required>
            {(control) => <Input {...control} ref={nameInputRef} />}
          </FormField>
          <FormField label="Description">{(control) => <Textarea {...control} />}</FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete project?"
        description="Website Redesign and its 45 tasks will be permanently deleted. This cannot be undone."
        confirmLabel="Delete project"
        onConfirm={() =>
          new Promise<void>((resolve) => {
            window.setTimeout(() => {
              toast.success('Project deleted');
              resolve();
            }, 1000);
          })
        }
      />
    </Section>
  );
}

function CrashingWidget(): ReactNode {
  throw new Error('Demo render error');
}

function FeedbackSection() {
  const [crash, setCrash] = useState(false);

  return (
    <Section title="Banners, states and loading">
      <div className="grid gap-3">
        <Banner
          variant="warning"
          title="Please verify your email address"
          action={
            <Button size="sm" variant="secondary">
              Resend email
            </Button>
          }
        >
          You can browse, but creating and editing are disabled until your email is verified.
        </Banner>
        <Banner variant="info" title="Heads up" onDismiss={() => undefined}>
          Info banners can be dismissed.
        </Banner>
        <Banner variant="success" title="Password changed" />
        <Banner variant="danger" title="Your session has expired" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <EmptyState
            title="No projects yet"
            description="Create your first project to start organising tasks."
            action={<Button leftIcon={<Plus aria-hidden="true" />}>Create project</Button>}
          />
        </Card>
        <Card>
          <ErrorState onRetry={() => undefined} correlationId="0HN7S2K9QF1M2" />
        </Card>
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-primary-text">
              <Spinner /> <span className="text-sm text-muted-foreground">Spinner</span>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1">
                <SkeletonText lines={2} />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Error boundary: a crash inside this card is contained, and the rest of the page keeps
            working.
          </p>
          <ErrorBoundary
            fallback={({ reset }) => (
              <ErrorState
                title="This widget crashed"
                description="Only this card is affected."
                onRetry={() => {
                  setCrash(false);
                  reset();
                }}
              />
            )}
          >
            {crash ? <CrashingWidget /> : null}
            <Button
              variant="secondary"
              leftIcon={<Bomb aria-hidden="true" />}
              onClick={() => {
                setCrash(true);
              }}
            >
              Crash this widget
            </Button>
          </ErrorBoundary>
        </CardContent>
      </Card>
    </Section>
  );
}

interface SampleTask {
  id: number;
  title: string;
  status: TaskItemStatus;
  priority: TaskPriority;
  assignee: string | null;
  due: string;
}

const NAMES = ['Jane Doe', 'Ali Khan', 'Maria Garcia', 'Wei Chen', null] as const;
const SAMPLE_TASKS: SampleTask[] = Array.from({ length: 23 }, (_, index) => ({
  id: 100 + index,
  title: `Sample task ${index + 1}`,
  status: TASK_STATUSES[index % TASK_STATUSES.length] ?? 'Todo',
  priority: TASK_PRIORITIES[(index * 3) % TASK_PRIORITIES.length] ?? 'Medium',
  assignee: NAMES[index % NAMES.length] ?? null,
  due: `2026-12-${String((index % 28) + 1).padStart(2, '0')}`,
}));

const SORTERS: Record<string, (a: SampleTask, b: SampleTask) => number> = {
  Title: (a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }),
  Priority: (a, b) => TASK_PRIORITY_META[a.priority].rank - TASK_PRIORITY_META[b.priority].rank,
  DueDate: (a, b) => a.due.localeCompare(b.due),
};

const COLUMNS: DataTableColumn<SampleTask>[] = [
  {
    id: 'Title',
    header: 'Title',
    sortable: true,
    cell: (task) => <span className="font-medium">{task.title}</span>,
  },
  { id: 'Status', header: 'Status', cell: (task) => <StatusBadge status={task.status} /> },
  {
    id: 'Priority',
    header: 'Priority',
    sortable: true,
    cell: (task) => <PriorityBadge priority={task.priority} />,
  },
  {
    id: 'Assignee',
    header: 'Assignee',
    hideBelow: 'md',
    cell: (task) =>
      task.assignee ? (
        <span className="inline-flex items-center gap-2">
          <Avatar name={task.assignee} size="xs" />
          {task.assignee}
        </span>
      ) : (
        <span className="text-muted-foreground">Unassigned</span>
      ),
  },
  { id: 'DueDate', header: 'Due date', sortable: true, cell: (task) => task.due },
];

function TableSection() {
  const [sort, setSort] = useState<SortState>({ columnId: 'DueDate', direction: 'Asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [view, setView] = useState('data');

  const rows = useMemo(() => {
    const sorter = SORTERS[sort.columnId];
    const sorted = sorter ? [...SAMPLE_TASKS].sort(sorter) : SAMPLE_TASKS;
    if (sort.direction === 'Desc') sorted.reverse();
    return sorted.slice((page - 1) * pageSize, page * pageSize);
  }, [sort, page, pageSize]);

  return (
    <Section title="Data table and pagination">
      <Tabs value={view} onValueChange={setView}>
        <TabsList aria-label="Table state">
          <TabsTrigger value="data">With data</TabsTrigger>
          <TabsTrigger value="loading">Loading</TabsTrigger>
          <TabsTrigger value="empty">Empty</TabsTrigger>
        </TabsList>
        <TabsContent value="data" className="space-y-4">
          <DataTable
            caption="Sample tasks"
            columns={COLUMNS}
            rows={rows}
            getRowId={(task) => task.id}
            sort={sort}
            onSortChange={(next) => {
              setSort(next);
              setPage(1);
            }}
          />
          <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={SAMPLE_TASKS.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            itemLabel="tasks"
          />
        </TabsContent>
        <TabsContent value="loading">
          <DataTable
            caption="Loading tasks"
            columns={COLUMNS}
            rows={[]}
            getRowId={(task) => task.id}
            isLoading
          />
        </TabsContent>
        <TabsContent value="empty">
          <DataTable
            caption="No tasks"
            columns={COLUMNS}
            rows={[]}
            getRowId={(task) => task.id}
            emptyState={
              <EmptyState
                title="No tasks match your filters"
                description="Try removing a filter or searching for something else."
              />
            }
          />
        </TabsContent>
      </Tabs>
    </Section>
  );
}
