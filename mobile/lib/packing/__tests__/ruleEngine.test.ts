import {
  classifyWeather,
  generatePackingList,
  type PackingTripContext,
} from '../ruleEngine';

const baseTrip: PackingTripContext = {
  destination: 'Tokyo, Japan',
  start_date: '2026-06-01',
  end_date: '2026-06-04',
  accommodation: 'hotel',
  travel_method: 'flight',
  travelers: 1,
};

function names(items: ReturnType<typeof generatePackingList>) {
  return items.map((item) => item.item_name);
}

describe('packing rule engine', () => {
  it('always includes passport or ID and phone charger', () => {
    const items = generatePackingList(baseTrip);

    expect(names(items)).toContain('Passport or ID');
    expect(names(items)).toContain('Phone charger');
  });

  it('adds sunscreen and sunglasses for hot weather', () => {
    const items = generatePackingList(baseTrip, ['hot']);

    expect(names(items)).toContain('Sunscreen SPF 50+');
    expect(names(items)).toContain('Sunglasses');
  });

  it('adds winter gear for cold and snowy weather', () => {
    const items = generatePackingList(baseTrip, ['cold', 'snow']);

    expect(names(items)).toContain('Heavy winter coat');
    expect(names(items)).toContain('Snow boots');
    expect(names(items)).toContain('Warm gloves');
  });

  it('adds beach, hiking, and camping gear for selected activities', () => {
    const items = generatePackingList(baseTrip, [], ['beach', 'hiking', 'camping']);

    expect(names(items)).toContain('Swimsuit');
    expect(names(items)).toContain('Hiking boots');
    expect(names(items)).toContain('Tent');
  });

  it('scales duration-based clothing quantities by days and travelers', () => {
    const items = generatePackingList({
      ...baseTrip,
      end_date: '2026-06-07',
      travelers: 2,
    });

    expect(items.find((item) => item.item_name === 'Underwear')?.quantity).toBe(16);
    expect(items.find((item) => item.item_name === 'T-shirts / tops')?.quantity).toBe(14);
    expect(items.find((item) => item.item_name === 'Pants / shorts')?.quantity).toBe(8);
  });

  it('merges duplicate item names instead of duplicating them', () => {
    const items = generatePackingList(baseTrip, ['hot'], ['beach']);
    const sunscreen = items.filter((item) => item.item_name === 'Sunscreen SPF 50+');
    const waterBottle = items.filter((item) => item.item_name === 'Reusable water bottle');

    expect(sunscreen).toHaveLength(1);
    expect(sunscreen[0].essential).toBe(true);
    expect(waterBottle).toHaveLength(1);
    expect(waterBottle[0].essential).toBe(true);
  });

  it('classifies rain, snow, hot, cold, and cool weather for packing rules', () => {
    expect(classifyWeather(30, false, false)).toEqual(['hot']);
    expect(classifyWeather(2, true, false)).toEqual(['rain', 'cold']);
    expect(classifyWeather(10, false, false)).toEqual(['cool']);
    expect(classifyWeather(-3, false, true)).toEqual(['snow', 'cold']);
  });
});
