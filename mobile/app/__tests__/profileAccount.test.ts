import fs from 'fs';
import path from 'path';

const profileSource = fs.readFileSync(
  path.resolve(__dirname, '../(tabs)/profile.tsx'),
  'utf8',
);

describe('profile account management', () => {
  it('exposes account deletion from the profile screen', () => {
    expect(profileSource).toContain('Delete Account');
    expect(profileSource).toContain('usersApi.deleteAccount');
  });
});
