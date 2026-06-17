import {
  classifyWeather,
  generateActivityPackingItems,
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

  it('adds optional entertainment items for downtime', () => {
    const items = generatePackingList(baseTrip);

    const book = items.find((item) => item.item_name === 'Favorite book or e-reader');
    const game = items.find((item) => item.item_name === 'Travel-size game / deck of cards');
    const downloads = items.find((item) => item.item_name === 'Downloaded movies, podcasts, or playlists');

    expect(book).toMatchObject({
      category: 'Entertainment',
      quantity: 1,
      essential: false,
      source: 'rule_engine',
      traveler_type: 'shared',
    });
    expect(game).toMatchObject({ category: 'Entertainment', essential: false });
    expect(downloads).toMatchObject({ category: 'Entertainment', essential: false });
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

  it('scales personal essentials by travelers while keeping shared essentials as group quantities', () => {
    const items = generatePackingList({
      ...baseTrip,
      travelers: 2,
    });

    expect(items.find((item) => item.item_name === 'Passport or ID')?.quantity).toBe(2);
    expect(items.find((item) => item.item_name === 'Toothbrush')?.quantity).toBe(2);
    expect(items.find((item) => item.item_name === 'Phone charger')?.quantity).toBe(2);
    expect(items.find((item) => item.item_name === 'Toothpaste')?.quantity).toBe(1);
    expect(items.find((item) => item.item_name === 'Reservation confirmations')?.quantity).toBe(1);
  });

  it('keeps the larger scaled quantity when duplicate personal recommendations merge', () => {
    const items = generatePackingList({
      ...baseTrip,
      travelers: 2,
    }, ['hot']);

    const waterBottle = items.filter((item) => item.item_name === 'Reusable water bottle');

    expect(waterBottle).toHaveLength(1);
    expect(waterBottle[0].quantity).toBe(2);
    expect(waterBottle[0].essential).toBe(true);
  });

  it('scales direct activity packing suggestions by travelers when requested', () => {
    const items = generateActivityPackingItems('beach', 2);

    expect(items.find((item) => item.item_name === 'Swimsuit')?.quantity).toBe(4);
    expect(items.find((item) => item.item_name === 'Sunscreen SPF 50+')?.quantity).toBe(1);
  });

  it('splits activity clothing additions by known traveler types', () => {
    const items = generateActivityPackingItems('beach', {
      ...baseTrip,
      travelers: 2,
      male_travelers: 1,
      female_travelers: 1,
    });

    expect(items.find((item) => item.item_name === 'Swimsuit' && item.traveler_type === 'male')?.quantity).toBe(2);
    expect(items.find((item) => item.item_name === 'Swimsuit' && item.traveler_type === 'female')?.quantity).toBe(2);
    expect(items.find((item) => item.item_name === 'Swimsuit' && item.traveler_type === 'shared')).toBeUndefined();
    expect(items.find((item) => item.item_name === 'Sunscreen SPF 50+')?.traveler_type).toBe('shared');
  });

  it('tags personal, child, pet, and shared items by traveler type', () => {
    const items = generatePackingList({
      ...baseTrip,
      travelers: 4,
      male_travelers: 1,
      female_travelers: 1,
      children: 1,
      pets: 1,
    }, ['hot'], ['beach']);

    expect(items.find((item) => item.item_name === 'Passport or ID')?.traveler_type).toBe('shared');
    expect(items.find((item) => item.item_name === 'Razors / shaving kit')?.traveler_type).toBe('male');
    expect(items.find((item) => item.item_name === 'Bras')?.traveler_type).toBe('female');
    expect(items.find((item) => item.item_name === 'Kids sunscreen')?.traveler_type).toBe('child');
    expect(items.find((item) => item.item_name === 'Pet leash')?.traveler_type).toBe('pet');
  });

  it('keeps generated clothing out of Shared when traveler types are known', () => {
    const items = generatePackingList({
      ...baseTrip,
      travelers: 2,
      male_travelers: 1,
      female_travelers: 1,
    }, ['rain']);

    expect(items.find((item) => item.item_name === 'Underwear' && item.traveler_type === 'male')?.quantity).toBe(5);
    expect(items.find((item) => item.item_name === 'Underwear' && item.traveler_type === 'female')?.quantity).toBe(5);
    expect(items.find((item) => item.item_name === 'Waterproof rain jacket' && item.traveler_type === 'male')?.quantity).toBe(1);
    expect(items.find((item) => item.item_name === 'Waterproof rain jacket' && item.traveler_type === 'female')?.quantity).toBe(1);
    expect(items.filter((item) => item.category === 'Clothing' && item.traveler_type === 'shared')).toEqual([]);
  });

  it('uses all trip legs when adding travel and accommodation packing rules', () => {
    const items = generatePackingList({
      ...baseTrip,
      legs: [
        {
          destination: 'Paris, France',
          start_date: '2026-06-01',
          end_date: '2026-06-03',
          travel_method: 'flight',
          accommodation: 'hotel',
        },
        {
          destination: 'Chamonix, France',
          start_date: '2026-06-04',
          end_date: '2026-06-07',
          travel_method: 'train',
          accommodation: 'camping',
        },
      ],
    });

    expect(names(items)).toContain('Printed boarding passes (backup)');
    expect(names(items)).toContain('Printed tickets (backup)');
    expect(names(items)).toContain('Tent');
    expect(names(items)).toContain('Sleeping bag');
  });

  it('caps clothing quantities to about a week when laundry is available', () => {
    const items = generatePackingList({
      ...baseTrip,
      start_date: '2026-06-01',
      end_date: '2026-06-20',
      travelers: 2,
      has_laundry_access: true,
    });

    expect(items.find((item) => item.item_name === 'Underwear')?.quantity).toBe(16);
    expect(items.find((item) => item.item_name === 'T-shirts / tops')?.quantity).toBe(14);
  });

  it('adds female traveler personal care items while splitting clothing quantities by traveler type', () => {
    const items = generatePackingList({
      ...baseTrip,
      travelers: 3,
      female_travelers: 2,
    });

    const underwear = items.filter((item) => item.item_name === 'Underwear');
    expect(underwear.reduce((total, item) => total + item.quantity, 0)).toBe(15);
    expect(underwear.find((item) => item.traveler_type === 'female')?.quantity).toBe(10);
    expect(underwear.find((item) => item.traveler_type === 'shared')?.quantity).toBe(5);
    expect(names(items)).toContain('Bras');
    expect(names(items)).toContain('Makeup / cosmetics bag');
  });

  it('does not add generic cultural packing items unless the selected activity needs extra attire', () => {
    const museumItems = generatePackingList(baseTrip, [], ['cultural']);
    const theaterItems = generatePackingList(baseTrip, [], ['theater']);

    expect(names(museumItems)).not.toContain('Modest / respectful attire (cover shoulders & knees)');
    expect(names(museumItems)).not.toContain('Smart evening outfit');
    expect(names(theaterItems)).toContain('Smart evening outfit');
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
