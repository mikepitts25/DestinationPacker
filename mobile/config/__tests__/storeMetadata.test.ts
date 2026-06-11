import { existsSync, readFileSync } from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
const metadataPath = path.join(projectRoot, 'store.config.json');
const easConfig = JSON.parse(readFileSync(path.join(projectRoot, 'eas.json'), 'utf8'));

describe('App Store metadata config', () => {
  it('tracks the public privacy policy URL for Apple metadata', () => {
    expect(existsSync(metadataPath)).toBe(true);

    const storeConfig = JSON.parse(readFileSync(metadataPath, 'utf8'));
    expect(storeConfig.apple.info['en-US'].privacyPolicyUrl).toBe(
      'https://colibricodellc.com/privacy-policy',
    );
  });

  it('points the production iOS submit profile at the metadata file', () => {
    expect(easConfig.submit.production.ios.metadataPath).toBe('./store.config.json');
  });
});
