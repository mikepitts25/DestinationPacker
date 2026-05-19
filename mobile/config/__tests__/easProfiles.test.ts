import { readFileSync } from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');

describe('EAS environment profiles', () => {
  const easConfig = JSON.parse(readFileSync(path.join(projectRoot, 'eas.json'), 'utf8'));

  it('uses the remote Supabase project for preview and production builds', () => {
    for (const profile of ['preview', 'production']) {
      expect(easConfig.build[profile].env.EXPO_PUBLIC_SUPABASE_URL).toBe(
        'https://qugwlnxdlzeymxratwkg.supabase.co',
      );
      expect(easConfig.build[profile].env.EXPO_PUBLIC_SUPABASE_ANON_KEY).toMatch(
        /^sb_publishable_/,
      );
    }
  });

  it('does not expose server-side secrets in mobile build profiles', () => {
    for (const profile of Object.values<{ env?: Record<string, string> }>(easConfig.build)) {
      const env = profile.env ?? {};
      expect(env).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
      expect(env).not.toHaveProperty('GEMINI_API_KEY');
    }
  });
});
