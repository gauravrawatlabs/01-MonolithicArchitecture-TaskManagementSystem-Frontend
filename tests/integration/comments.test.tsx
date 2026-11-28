import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiUrl, problem } from '../mocks/api';
import { buildMember, buildProjectDetails } from '../mocks/factories/projects';
import { buildTask } from '../mocks/factories/tasks';
import { buildUser } from '../mocks/factories/users';
import { buildComment, serveComments } from '../mocks/fakeCommentsApi';
import { serveProjects } from '../mocks/fakeProjectsApi';
import { serveTasks } from '../mocks/fakeTasksApi';
import { server } from '../mocks/server';
import { renderRoute } from '../utils/renderRoute';

const owner = buildUser({ firstName: 'Olivia', lastName: 'Owner', roles: ['Manager'] });
const author = buildUser({ firstName: 'Ava', lastName: 'Author' });
const other = buildUser({ firstName: 'Oscar', lastName: 'Other' });
const admin = buildUser({ firstName: 'Ada', lastName: 'Admin', roles: ['Admin'] });
const project = buildProjectDetails({
  id: 7,
  ownerId: owner.id,
  members: [
    buildMember({ userId: owner.id, memberRole: 'Owner' }),
    buildMember({ userId: author.id }),
    buildMember({ userId: other.id }),
  ],
});
const task = buildTask({
  id: 501,
  title: 'Write homepage copy',
  projectId: 7,
  createdById: owner.id,
});
const first = buildComment({
  authorId: author.id,
  authorName: 'Ava Author',
  content: 'First draft is up.',
});
const second = buildComment({
  authorId: other.id,
  authorName: 'Oscar Other',
  content: 'Looks good!',
  updatedAtUtc: '2026-11-21T10:00:00Z',
});

function openTask(user: ReturnType<typeof buildUser>, comments = [first, second]) {
  serveProjects([project], { currentUser: user });
  serveTasks([task], { currentUser: user, projects: [project] });
  const fake = serveComments(comments, { currentUser: user });
  const rendered = renderRoute('/tasks/501', { user });
  return { ...fake, ...rendered };
}
const list = () => screen.getByRole('list', { name: 'Comments' });
const commentByAuthor = (name: string) =>
  within(list())
    .getAllByRole('listitem')
    .find((item) => within(item).queryByRole('heading', { name: new RegExp(name) }));

describe('Comments on a task', () => {
  it('shows the discussion oldest first, with a count and an "edited" marker', async () => {
    openTask(author);

    expect(await screen.findByRole('heading', { name: 'Comments (2)' })).toBeInTheDocument();
    expect(
      within(list())
        .getAllByRole('heading')
        .map((h) => h.textContent),
    ).toEqual(['Ava Author (you)', 'Oscar Other']);
    expect(within(commentByAuthor('Oscar') ?? list()).getByText(/edited/)).toBeInTheDocument();
  });

  it('loads older pages with "Show more" (20 at a time)', async () => {
    const many = Array.from({ length: 23 }, (_, i) =>
      buildComment({
        content: `Note ${String(i + 1)}`,
        createdAtUtc: new Date(Date.UTC(2026, 10, 1, 0, i)).toISOString(),
      }),
    );
    const { user, pageQueries } = openTask(author, many);

    await screen.findByText('Note 20');
    expect(screen.queryByText('Note 21')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show more comments (3)' }));

    expect(await screen.findByText('Note 23')).toBeInTheDocument();
    expect(pageQueries.map((q) => q.get('Page'))).toEqual(['1', '2']);
    expect(screen.queryByRole('button', { name: /Show more comments/ })).not.toBeInTheDocument();
  });

  it('adds a comment with Ctrl+Enter (trimmed), after refusing an empty one', async () => {
    const { user, requests } = openTask(other);
    const box = await screen.findByLabelText('Add a comment');

    await user.click(screen.getByRole('button', { name: 'Comment' }));
    expect(await screen.findByText('Comment is required.')).toBeInTheDocument();
    expect(requests).toHaveLength(0);

    await user.type(box, '  Ship it on Friday?  ');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(await screen.findByText('Comment added')).toBeInTheDocument();
    expect(requests[0]?.body).toEqual({ content: 'Ship it on Friday?' });
    expect(await within(list()).findByText('Ship it on Friday?')).toBeInTheDocument();
    expect(box).toHaveValue('');
    expect(screen.getByRole('heading', { name: 'Comments (3)' })).toBeInTheDocument();
  });

  it('lets the author edit their own words (focus moves into the box)', async () => {
    const { user, requests } = openTask(author);
    await screen.findByText('First draft is up.');

    expect(
      screen.queryByRole('button', { name: 'Edit comment by Oscar Other' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit comment by Ava Author' }));
    const box = screen.getByLabelText('Edit comment');
    expect(box).toHaveFocus();
    await user.clear(box);
    await user.type(box, 'Second draft is up.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await within(list()).findByText('Second draft is up.')).toBeInTheDocument();
    expect(requests).toEqual([
      {
        method: 'PUT',
        path: `/api/comments/${String(first.id)}`,
        body: { content: 'Second draft is up.' },
      },
    ]);
    expect(within(commentByAuthor('Ava') ?? list()).getByText(/edited/)).toBeInTheDocument();
  });

  it("an Admin may delete but not edit someone else's comment; the project owner may moderate", async () => {
    openTask(admin);
    await screen.findByText('First draft is up.');
    expect(screen.queryByRole('button', { name: /^Edit comment/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Delete comment by Ava Author' }),
    ).toBeInTheDocument();
  });

  it("deletes after confirming; a plain member sees no actions on others' comments", async () => {
    const { user, requests } = openTask(owner);
    await screen.findByText('First draft is up.');

    await user.click(screen.getByRole('button', { name: 'Delete comment by Ava Author' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete this comment?' });
    expect(
      within(dialog).getByText(/Ava Author's comment will be removed for everyone/),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete comment' }));

    await waitFor(() => {
      expect(screen.queryByText('First draft is up.')).not.toBeInTheDocument();
    });
    expect(requests).toEqual([
      { method: 'DELETE', path: `/api/comments/${String(first.id)}`, body: undefined },
    ]);
  });

  it('shows the server message when a write is refused (403)', async () => {
    const { user } = openTask(author);
    server.use(
      http.put(apiUrl('/api/comments/:id'), () =>
        problem(403, { detail: 'You are no longer a member of this project.' }),
      ),
    );
    await user.click(await screen.findByRole('button', { name: 'Edit comment by Ava Author' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You are no longer a member of this project.',
    );
  });

  it('asks unverified users to verify before commenting', async () => {
    openTask({ ...other, emailConfirmed: false });
    expect(await screen.findByText('Verify your email address to comment.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Add a comment')).not.toBeInTheDocument();
  });
});
