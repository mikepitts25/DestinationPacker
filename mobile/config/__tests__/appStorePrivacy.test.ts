import { readFileSync } from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const appConfig = JSON.parse(readFileSync(path.join(projectRoot, 'app.json'), 'utf8')).expo;
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

describe('App Store privacy-sensitive native config', () => {
  it('does not declare unused device location permission strings', () => {
    expect(appConfig.ios?.infoPlist ?? {}).not.toHaveProperty('NSLocationWhenInUseUsageDescription');
    expect(appConfig.android?.permissions ?? []).not.toContain('ACCESS_FINE_LOCATION');
  });

  it('does not include notification native modules until reminders are implemented', () => {
    expect(appConfig.plugins).not.toContain('expo-notifications');
    expect(packageJson.dependencies).not.toHaveProperty('expo-notifications');
  });

  it('declares standard encryption export compliance for App Store Connect', () => {
    expect(appConfig.ios?.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
  });
});
