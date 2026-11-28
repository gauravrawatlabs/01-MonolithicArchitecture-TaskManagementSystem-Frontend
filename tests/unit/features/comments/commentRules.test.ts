import { describe, expect, it } from 'vitest';

import { canAddComment, commentPermissions } from '@/features/comments/commentRules';

import { buildMember, buildProjectDetails } from '../../../mocks/factories/projects';
import { buildUser } from '../../../mocks/factories/users';

describe('comment permissions (mirror of CommentAuthorizationHandler + EmailVerified)', () => {
  const owner = buildUser({ roles: ['Manager'] });
  const author = buildUser();
  const other = buildUser();
  const admin = buildUser({ roles: ['Admin'] });
  const project = buildProjectDetails({
    ownerId: owner.id,
    members: [
      buildMember({ userId: owner.id }),
      buildMember({ userId: author.id }),
      buildMember({ userId: other.id }),
    ],
  });
  const comment = { authorId: author.id };

  it.each([
    ['author', author, { canEdit: true, canDelete: true }],
    ['project owner (moderation)', owner, { canEdit: false, canDelete: true }],
    [
      "Admin: may delete, may NOT edit someone else's words",
      admin,
      { canEdit: false, canDelete: true },
    ],
    ['other member', other, { canEdit: false, canDelete: false }],
  ])('%s', (_name, user, expected) => {
    expect(commentPermissions(user, comment, project)).toEqual(expected);
  });

  it('an author who left the project can neither edit nor delete', () => {
    const left = buildProjectDetails({
      ownerId: owner.id,
      members: [buildMember({ userId: owner.id })],
    });
    expect(commentPermissions(author, comment, left)).toEqual({ canEdit: false, canDelete: false });
  });

  it('nothing without a verified email, for anyone', () => {
    expect(commentPermissions({ ...author, emailConfirmed: false }, comment, project)).toEqual({
      canEdit: false,
      canDelete: false,
    });
    expect(
      commentPermissions({ ...admin, emailConfirmed: false }, comment, project).canDelete,
    ).toBe(false);
    expect(canAddComment({ ...other, emailConfirmed: false })).toBe(false);
    expect(canAddComment(other)).toBe(true);
  });
});
