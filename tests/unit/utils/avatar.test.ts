import { describe, expect, it } from 'vitest';

import { AVATAR_COLORS, getAvatarColor, getInitials } from '@/utils/avatar';

describe('getInitials', () => {
  it.each([
    ['Jane Doe', 'JD'],
    ['jane', 'J'],
    ['Maria José García López', 'ML'],
    ['  ali   khan  ', 'AK'],
    ['', '?'],
    ['   ', '?'],
  ])('%j → %j', (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });
});

describe('getAvatarColor', () => {
  it('always returns the same colour for the same name', () => {
    expect(getAvatarColor('Jane Doe')).toBe(getAvatarColor('Jane Doe'));
  });

  it('returns one of the accessible palette entries, even for an empty name', () => {
    expect(AVATAR_COLORS).toContain(getAvatarColor(''));
    expect(AVATAR_COLORS).toContain(getAvatarColor('Wei Chen'));
  });

  it('spreads different names over several colours', () => {
    const names = ['Jane Doe', 'Ali Khan', 'Maria Garcia', 'Wei Chen', 'Sam Lee', 'Priya Patel'];
    expect(new Set(names.map(getAvatarColor)).size).toBeGreaterThan(2);
  });
});
