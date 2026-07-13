import fs from 'fs';
import path from 'path';

const appDirectory = path.resolve(__dirname, '..');
const projectRoot = path.resolve(appDirectory, '..');

const loginSource = fs.readFileSync(path.join(appDirectory, '(auth)/login.tsx'), 'utf8');
const profileSource = fs.readFileSync(path.join(appDirectory, '(tabs)/profile.tsx'), 'utf8');
const upgradeSource = fs.readFileSync(path.join(appDirectory, 'upgrade-account.tsx'), 'utf8');
const apiSource = fs.readFileSync(path.join(projectRoot, 'services/api.ts'), 'utf8');

describe('anonymous-first onboarding', () => {
  it('offers a guest entry point on the login screen', () => {
    expect(loginSource).toContain('Try it without an account');
    expect(loginSource).toContain('loginAnonymously');
  });

  it('uses Supabase anonymous sign-in and account linking, not a second signup', () => {
    expect(apiSource).toContain('signInAnonymously');
    // Upgrading must attach credentials to the SAME auth user so guest trips
    // survive; a fresh signUp would orphan them.
    expect(upgradeSource).toContain('upgradeAccount');
    expect(apiSource).toContain('auth.updateUser');
  });

  it('warns guests before sign-out destroys their trips', () => {
    expect(profileSource).toContain('Sign Out Anyway');
    expect(profileSource).toContain('/upgrade-account');
  });
});
