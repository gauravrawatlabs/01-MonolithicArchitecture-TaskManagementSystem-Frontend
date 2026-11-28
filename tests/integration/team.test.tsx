import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildMember, buildProjectDetails } from '../mocks/factories/projects';
import { buildTask } from '../mocks/factories/tasks';
import { buildUser } from '../mocks/factories/users';
import { serveProjects } from '../mocks/fakeProjectsApi';
import { serveTasks } from '../mocks/fakeTasksApi';
import { currentUrl, renderRoute } from '../utils/renderRoute';

const me = buildUser({ firstName: 'Mia', lastName: 'Me' });
const carla = {
  userId: '00000000-0000-4000-8000-00000000c0c0',
  fullName: 'Carla Diaz',
  email: 'carla@example.test',
};
const dan = {
  userId: '00000000-0000-4000-8000-00000000d0d0',
  fullName: 'Dan Dev',
  email: 'dan@example.test',
};
const website = buildProjectDetails({
  id: 1,
  name: 'Website',
  ownerId: carla.userId,
  members: [
    buildMember({ ...carla, memberRole: 'Owner' }),
    buildMember({ userId: me.id, fullName: 'Mia Me', email: me.email }),
    buildMember({ ...dan }),
  ],
});
const mobile = buildProjectDetails({
  id: 2,
  name: 'Mobile',
  ownerId: me.id,
  members: [
    buildMember({ userId: me.id, fullName: 'Mia Me', email: me.email, memberRole: 'Owner' }),
    buildMember({ ...carla }),
  ],
});

function serveTeam() {
  serveProjects([website, mobile], { currentUser: me });
  return serveTasks(
    [
      buildTask({
        id: 71,
        title: 'Fix footer',
        projectId: 1,
        projectName: 'Website',
        assignedToId: carla.userId,
        assignedToName: carla.fullName,
      }),
    ],
    { currentUser: me, projects: [website, mobile] },
  );
}

describe('Team', () => {
  it('merges the members of all my projects, once per person, with their projects and roles', async () => {
    serveTeam();
    renderRoute('/team', { user: me });

    const list = await screen.findByRole('list', { name: 'Team members' });
    // In name order; each link's name is just the person's name.
    expect(
      within(list)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Carla Diaz', 'Dan Dev', 'Mia Me']);
    expect(within(list).getByText('(you)')).toBeInTheDocument();
    const carlasProjects = within(list).getByRole('list', { name: "Carla Diaz's projects" });
    expect(
      within(carlasProjects)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Mobile', 'Website · Owner']);
    expect(screen.getByText('3 people')).toBeInTheDocument();
  });

  it('searches by name or email (kept in the URL)', async () => {
    serveTeam();
    const { user, router } = renderRoute('/team', { user: me });
    await screen.findByRole('list', { name: 'Team members' });

    await user.type(screen.getByRole('searchbox', { name: 'Search team' }), 'dan@');
    expect(screen.getByText('1 of 3 people')).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/team?search=dan%40');
  });

  it('shows a member: shared projects with role, and their assigned tasks I can see', async () => {
    const { listQueries } = serveTeam();
    renderRoute(`/team/${carla.userId}`, { user: me });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Carla Diaz' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'carla@example.test' })).toHaveAttribute(
      'href',
      'mailto:carla@example.test',
    );
    expect(screen.getByText(/Owner · since/)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Fix footer' })).toBeInTheDocument();
    await waitFor(() => {
      expect(listQueries.at(-1)?.get('AssignedToId')).toBe(carla.userId);
    });
    expect(screen.queryByRole('link', { name: 'Manage account' })).not.toBeInTheDocument(); // not an Admin
  });

  it('says so for someone outside my projects', async () => {
    serveTeam();
    renderRoute('/team/00000000-0000-4000-8000-0000000000ff', { user: me });
    expect(
      await screen.findByRole('heading', { name: 'Not in your projects' }),
    ).toBeInTheDocument();
  });
});
