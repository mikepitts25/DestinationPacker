import fs from 'fs';
import path from 'path';

const homeSource = fs.readFileSync(
  path.resolve(__dirname, '../(tabs)/index.tsx'),
  'utf8',
);
const tabsLayoutSource = fs.readFileSync(
  path.resolve(__dirname, '../(tabs)/_layout.tsx'),
  'utf8',
);

describe('home empty state', () => {
  it('explains the first trip workflow before the user has trips', () => {
    expect(homeSource).toContain('Plan smarter before you pack');
    expect(homeSource).toContain('readiness dashboard');
    expect(homeSource).toContain('Start a Trip');
  });

  it('uses the home hero as the only Trips screen title', () => {
    expect(homeSource).toContain('styles.headerTitle');
    expect(tabsLayoutSource).toContain("name=\"index\"");
    expect(tabsLayoutSource).toContain('headerShown: false');
  });
});
