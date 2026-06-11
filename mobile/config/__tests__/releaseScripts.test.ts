import { readFileSync } from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

describe('release scripts', () => {
  it('provides a single release verification command', () => {
    expect(packageJson.scripts['verify:release']).toBe(
      'npm run type-check && npm test && npm run lint && npx expo-doctor && npx eas-cli metadata:lint --profile production',
    );
  });

  it('documents the interactive iOS credential setup command', () => {
    expect(packageJson.scripts['credentials:ios']).toBe(
      'npx eas-cli credentials:configure-build --platform ios --profile production',
    );
  });
});
