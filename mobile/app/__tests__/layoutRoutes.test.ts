import fs from 'fs';
import path from 'path';

const appDirectory = path.resolve(__dirname, '..');

function rootStackScreenNames() {
  const rootLayout = fs.readFileSync(path.join(appDirectory, '_layout.tsx'), 'utf8');

  return [...rootLayout.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g)].map((match) => match[1]);
}

function hasTopLevelRoute(screenName: string) {
  return (
    fs.existsSync(path.join(appDirectory, `${screenName}.tsx`)) ||
    fs.existsSync(path.join(appDirectory, screenName, '_layout.tsx'))
  );
}

describe('root layout routes', () => {
  it('registers only route names that exist as top-level routes', () => {
    expect(rootStackScreenNames().filter((screenName) => !hasTopLevelRoute(screenName))).toEqual([]);
  });
});
