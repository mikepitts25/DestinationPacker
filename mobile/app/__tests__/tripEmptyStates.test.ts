import fs from 'fs';
import path from 'path';

function readTripRoute(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, '../trip/[id]', relativePath), 'utf8');
}

describe('trip tab empty states', () => {
  it('explains how to recover when activities are empty', () => {
    const source = readTripRoute('activities.tsx');

    expect(source).toContain('No trip ideas yet');
    expect(source).toContain('sights, classes, tastings, local buys');
    expect(source).toContain('named restaurants, and bars');
    expect(source).not.toContain('reviewed restaurants');
    expect(source).toContain('Refresh Ideas');
  });

  it('explains why weather may be unavailable', () => {
    const source = readTripRoute('weather.tsx');

    expect(source).toContain('Weather needs a matched destination');
    expect(source).toContain('destination from search');
    expect(source).toContain('forecast-specific extras');
  });
});
