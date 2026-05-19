import { tripAdvisorGuideForDestination } from '../tripAdvisor';

describe('tripAdvisorGuideForDestination', () => {
  it('turns Berlin local suggestions into food and souvenir guide sections', () => {
    const guide = tripAdvisorGuideForDestination('Berlin, Germany');

    expect(guide.foods.map((item) => item.title)).toContain('Currywurst');
    expect(guide.souvenirs.map((item) => item.title)).toContain('Ampelmann souvenir');
    expect(guide.customs.some((item) => item.title === 'Cash is still useful')).toBe(true);
    expect(guide.practical.some((item) => item.title === 'Sunday closures')).toBe(true);
  });

  it('includes Sri Lanka-specific practical guidance', () => {
    const guide = tripAdvisorGuideForDestination('Ella, Sri Lanka');

    expect(guide.foods.map((item) => item.title)).toContain('Hoppers');
    expect(guide.souvenirs.map((item) => item.title)).toContain('Ceylon tea');
    expect(guide.customs.some((item) => item.title === 'Temple etiquette')).toBe(true);
    expect(guide.practical.some((item) => item.title === 'Train tickets')).toBe(true);
  });

  it('provides useful fallback sections for unknown destinations', () => {
    const guide = tripAdvisorGuideForDestination('Made Up City');

    expect(guide.foods).toHaveLength(1);
    expect(guide.souvenirs[0].title).toBe('Local markets');
    expect(guide.customs.some((item) => item.title === 'Ask before photographing people')).toBe(true);
    expect(guide.practical.some((item) => item.title === 'Check import rules')).toBe(true);
  });
});
