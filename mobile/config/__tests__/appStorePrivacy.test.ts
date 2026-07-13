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

  it('configures expo-notifications for local trip reminders', () => {
    expect(packageJson.dependencies).toHaveProperty('expo-notifications');

    const notificationsPlugin = appConfig.plugins.find(
      (plugin: unknown) => Array.isArray(plugin) && plugin[0] === 'expo-notifications',
    );
    expect(notificationsPlugin).toBeDefined();
    expect(notificationsPlugin[1].icon).toBe('./assets/notification-icon.png');
  });

  it('declares standard encryption export compliance for App Store Connect', () => {
    expect(appConfig.ios?.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
  });
});
