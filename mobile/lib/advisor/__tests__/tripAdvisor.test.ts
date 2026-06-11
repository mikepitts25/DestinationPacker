import {
  buildTripAdvisorShareText,
  tripAdvisorGuideForDestination,
} from '../tripAdvisor';

describe('tripAdvisorGuideForDestination', () => {
  it('turns Berlin local suggestions into food and souvenir guide sections', () => {
    const guide = tripAdvisorGuideForDestination('Berlin, Germany');

    expect(guide.foods.map((item) => item.title)).toContain('Currywurst');
    expect(guide.souvenirs.map((item) => item.title)).toContain('Ampelmann souvenir');
    expect(guide.customs.some((item) => item.title === 'Cash is still useful')).toBe(true);
    expect(guide.practical.some((item) => item.title === 'Sunday closures')).toBe(true);
    expect(guide.booking.some((item) => item.title === 'Reichstag and museum slots')).toBe(true);
    expect(guide.buying.some((item) => item.title === 'Food and alcohol limits')).toBe(true);
    expect(guide.safety.some((item) => item.title === 'Ticket checks are common')).toBe(true);
  });

  it('includes Sri Lanka-specific practical guidance', () => {
    const guide = tripAdvisorGuideForDestination('Ella, Sri Lanka');

    expect(guide.foods.map((item) => item.title)).toContain('Hoppers');
    expect(guide.souvenirs.map((item) => item.title)).toContain('Ceylon tea');
    expect(guide.customs.some((item) => item.title === 'Temple etiquette')).toBe(true);
    expect(guide.practical.some((item) => item.title === 'Train tickets')).toBe(true);
    expect(guide.booking.some((item) => item.title === 'Scenic train seats')).toBe(true);
    expect(guide.buying.some((item) => item.title === 'Tea, spices, and natural products')).toBe(true);
    expect(guide.safety.some((item) => item.title === 'Water and sun')).toBe(true);
  });

  it('adds marketable booking and buying guidance for experience-heavy destinations', () => {
    const italyGuide = tripAdvisorGuideForDestination('Florence, Italy');
    const belgiumGuide = tripAdvisorGuideForDestination('Brussels, Belgium');

    expect(italyGuide.foods.map((item) => item.title)).toContain('Fresh pasta cooking class');
    expect(italyGuide.booking.some((item) => item.title === 'Timed museum entry')).toBe(true);
    expect(italyGuide.buying.some((item) => item.title === 'Oil, wine, cheese, and meat')).toBe(true);
    expect(belgiumGuide.foods.map((item) => item.title)).toContain('Belgian chocolate workshop');
    expect(belgiumGuide.booking.some((item) => item.title === 'Chocolate workshops')).toBe(true);
  });

  it('provides useful fallback sections for unknown destinations', () => {
    const guide = tripAdvisorGuideForDestination('Made Up City');

    expect(guide.foods).toHaveLength(1);
    expect(guide.souvenirs[0].title).toBe('Small local specialty from Made Up City');
    expect(guide.customs.some((item) => item.title === 'Ask before photographing people')).toBe(true);
    expect(guide.practical.some((item) => item.title === 'Check import rules')).toBe(true);
    expect(guide.booking.some((item) => item.title === 'Book must-do experiences early')).toBe(true);
    expect(guide.buying.some((item) => item.title === 'Check what can come home')).toBe(true);
    expect(guide.safety.some((item) => item.title === 'Build in buffer time')).toBe(true);
  });

  it('builds share text for destination briefings', () => {
    const berlinGuide = tripAdvisorGuideForDestination('Berlin, Germany');
    const text = buildTripAdvisorShareText([
      { destination: 'Berlin, Germany', guide: berlinGuide },
    ]);

    expect(text).toContain('DestinationPacker trip briefing for Berlin, Germany');
    expect(text).toContain('Foods to try');
    expect(text).toContain('Currywurst');
    expect(text).toContain('Book ahead');
    expect(text).toContain('Reichstag and museum slots');
    expect(text).toContain('Before you buy');
    expect(text).toContain('official customs/import rules');
  });
});
