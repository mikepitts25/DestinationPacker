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

  it('registers legal policy routes for App Store review links', () => {
    expect(rootStackScreenNames()).toEqual(expect.arrayContaining(['privacy', 'terms']));
    expect(hasTopLevelRoute('privacy')).toBe(true);
    expect(hasTopLevelRoute('terms')).toBe(true);
  });

  it('keeps trip briefing content in Overview instead of a separate Advisor tab', () => {
    const tripIndex = fs.readFileSync(path.join(appDirectory, 'trip/[id]/index.tsx'), 'utf8');
    const overview = fs.readFileSync(path.join(appDirectory, 'trip/[id]/overview.tsx'), 'utf8');
    const packing = fs.readFileSync(path.join(appDirectory, 'trip/[id]/packing.tsx'), 'utf8');

    expect(tripIndex).not.toContain('name="Advisor"');
    expect(overview).toContain('Destination Briefing');
    expect(overview).toContain('Share Briefing');
    expect(overview).toContain('Travel Notes');
    expect(overview).not.toContain('Trip readiness');
    expect(packing).toContain('Packing readiness');
  });
});
