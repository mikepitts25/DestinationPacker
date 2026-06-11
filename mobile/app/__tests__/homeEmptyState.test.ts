import fs from 'fs';
import path from 'path';

const homeSource = fs.readFileSync(
  path.resolve(__dirname, '../(tabs)/index.tsx'),
  'utf8',
);

describe('home empty state', () => {
  it('explains the first trip workflow before the user has trips', () => {
    expect(homeSource).toContain('Plan smarter before you pack');
    expect(homeSource).toContain('readiness dashboard');
    expect(homeSource).toContain('Start a Trip');
  });
});
