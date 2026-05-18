import type { AccommodationType, ItemSource, TravelMethod } from '@/types';

export interface PackingTripContext {
  destination: string;
  start_date: string;
  end_date: string;
  accommodation: AccommodationType;
  travel_method: TravelMethod;
  travelers: number;
}

export interface PackingRecommendation {
  category: string;
  item_name: string;
  quantity: number;
  essential: boolean;
  source: ItemSource;
  activity_type?: string | null;
}

type FixedRule = [category: string, itemName: string, quantity: number, essential: boolean];
type FormulaRule = [minDays: number, category: string, itemName: string, formula: string, essential: boolean];

const ALWAYS_RULES: FixedRule[] = [
  ['Documents', 'Passport or ID', 1, true],
  ['Documents', 'Travel insurance info', 1, true],
  ['Documents', 'Reservation confirmations', 1, true],
  ['Electronics', 'Phone charger', 1, true],
  ['Electronics', 'Portable battery bank', 1, false],
  ['Toiletries', 'Toothbrush', 1, true],
  ['Toiletries', 'Toothpaste', 1, true],
  ['Toiletries', 'Deodorant', 1, true],
  ['Toiletries', 'Shampoo & conditioner', 1, false],
  ['Toiletries', 'Body wash / soap', 1, false],
  ['Toiletries', 'Face wash', 1, false],
  ['Health', 'Prescription medications', 1, true],
  ['Health', 'Pain reliever (ibuprofen/acetaminophen)', 1, false],
  ['Health', 'Antacids', 1, false],
  ['Health', 'Band-aids', 1, false],
  ['Clothing', 'Comfortable walking shoes', 1, true],
  ['Clothing', 'Pajamas / sleepwear', 1, false],
  ['Misc', 'Reusable water bottle', 1, false],
  ['Misc', 'Small day bag / backpack', 1, false],
];

const DURATION_RULES: FormulaRule[] = [
  [1, 'Clothing', 'Underwear', '(days+1)*travelers', true],
  [1, 'Clothing', 'Socks', '(days+1)*travelers', true],
  [1, 'Clothing', 'T-shirts / tops', 'days*travelers', false],
  [1, 'Clothing', 'Pants / shorts', '(floor(days/2)+1)*travelers', false],
  [4, 'Toiletries', 'Laundry detergent sheets', '1', false],
  [7, 'Misc', 'Packing cubes', '1', false],
  [7, 'Misc', 'Travel-size laundry soap', '1', false],
];

const WEATHER_RULES: Record<string, FixedRule[]> = {
  rain: [
    ['Clothing', 'Waterproof rain jacket', 1, true],
    ['Clothing', 'Waterproof shoes / boots', 1, false],
    ['Misc', 'Compact travel umbrella', 1, false],
    ['Clothing', 'Quick-dry pants', 1, false],
  ],
  hot: [
    ['Toiletries', 'Sunscreen SPF 50+', 1, true],
    ['Clothing', 'Sunglasses', 1, true],
    ['Clothing', 'Sun hat / cap', 1, false],
    ['Clothing', 'Breathable shorts', 2, false],
    ['Clothing', 'Sandals / flip flops', 1, false],
    ['Misc', 'Electrolyte packets', 3, false],
    ['Misc', 'Reusable water bottle', 1, true],
  ],
  cold: [
    ['Clothing', 'Heavy winter coat', 1, true],
    ['Clothing', 'Thermal / base layers', 2, true],
    ['Clothing', 'Warm gloves', 1, true],
    ['Clothing', 'Knit hat / beanie', 1, true],
    ['Clothing', 'Wool or thermal socks', 3, false],
    ['Clothing', 'Winter boots', 1, false],
    ['Clothing', 'Scarf', 1, false],
  ],
  cool: [
    ['Clothing', 'Light jacket or fleece', 1, true],
    ['Clothing', 'Layering long-sleeve shirts', 2, false],
    ['Clothing', 'Light gloves', 1, false],
  ],
  snow: [
    ['Clothing', 'Snow boots', 1, true],
    ['Clothing', 'Waterproof winter coat', 1, true],
    ['Clothing', 'Thermal base layers', 2, true],
    ['Clothing', 'Warm gloves / mittens', 1, true],
    ['Clothing', 'Neck gaiter / balaclava', 1, false],
  ],
};

const ACTIVITY_RULES: Record<string, FixedRule[]> = {
  hiking: [
    ['Footwear', 'Hiking boots', 1, true],
    ['Clothing', 'Moisture-wicking hiking socks', 3, true],
    ['Clothing', 'Quick-dry hiking pants', 1, false],
    ['Gear', 'Daypack / hiking backpack', 1, false],
    ['Gear', 'Trekking poles', 1, false],
    ['Health', 'Blister pads', 1, false],
    ['Health', 'Bug spray / insect repellent', 1, true],
    ['Toiletries', 'Sunscreen SPF 50+', 1, true],
    ['Misc', 'Trail snacks (bars, nuts)', 3, false],
    ['Misc', 'Headlamp + extra batteries', 1, false],
    ['Health', 'First aid kit', 1, true],
  ],
  beach: [
    ['Clothing', 'Swimsuit', 2, true],
    ['Clothing', 'Beach cover-up', 1, false],
    ['Misc', 'Beach towel', 1, true],
    ['Toiletries', 'Sunscreen SPF 50+', 1, true],
    ['Clothing', 'Flip flops / sandals', 1, true],
    ['Clothing', 'Sunglasses', 1, true],
    ['Clothing', 'Sun hat', 1, false],
    ['Misc', 'Waterproof bag / dry bag', 1, false],
  ],
  water: [
    ['Clothing', 'Swimsuit', 2, true],
    ['Clothing', 'Rash guard', 1, false],
    ['Clothing', 'Water shoes', 1, false],
    ['Toiletries', 'Reef-safe sunscreen', 1, true],
    ['Misc', 'Waterproof phone case', 1, false],
    ['Misc', 'Dry bag', 1, false],
  ],
  snow: [
    ['Gear', 'Ski / snowboard gear (or plan to rent)', 1, true],
    ['Clothing', 'Ski goggles', 1, true],
    ['Clothing', 'Ski helmet (or rent)', 1, true],
    ['Clothing', 'Ski jacket', 1, true],
    ['Clothing', 'Ski pants / bibs', 1, true],
    ['Clothing', 'Moisture-wicking base layers', 2, true],
    ['Clothing', 'Ski socks', 3, true],
    ['Clothing', 'Warm gloves / mittens', 1, true],
    ['Misc', 'Hand warmers', 4, false],
    ['Toiletries', 'Lip balm with SPF', 1, false],
    ['Toiletries', 'High SPF sunscreen (sun reflects off snow)', 1, true],
  ],
  camping: [
    ['Gear', 'Tent', 1, true],
    ['Gear', 'Sleeping bag', 1, true],
    ['Gear', 'Sleeping pad / inflatable mat', 1, false],
    ['Gear', 'Camp stove + fuel', 1, false],
    ['Gear', 'Camp cookware set', 1, false],
    ['Gear', 'Headlamp + extra batteries', 1, true],
    ['Gear', 'Multi-tool / pocket knife', 1, false],
    ['Clothing', 'Warm fleece jacket', 1, true],
    ['Clothing', 'Rain jacket', 1, true],
    ['Health', 'Bug spray', 1, true],
    ['Toiletries', 'Biodegradable soap', 1, false],
    ['Misc', 'Camp chairs (if backpacking: skip)', 1, false],
    ['Misc', 'Matches / lighter', 2, true],
    ['Misc', 'Bear canister (check local rules)', 1, false],
  ],
  cultural: [
    ['Clothing', 'Modest / respectful attire (cover shoulders & knees)', 2, true],
    ['Clothing', 'Comfortable walking shoes', 1, true],
    ['Misc', 'Reusable tote bag for souvenirs', 1, false],
    ['Documents', 'Guidebook or offline maps', 1, false],
  ],
  nightlife: [
    ['Clothing', 'Going-out outfit', 2, true],
    ['Clothing', 'Dress shoes / heels', 1, false],
    ['Misc', 'Small clutch / evening bag', 1, false],
    ['Health', 'Earplugs (for light sleepers)', 1, false],
  ],
  business: [
    ['Clothing', 'Business attire (shirts, trousers/skirt)', 3, true],
    ['Clothing', 'Dress shoes', 1, true],
    ['Clothing', 'Blazer / sport coat', 1, true],
    ['Electronics', 'Laptop + charger', 1, true],
    ['Electronics', 'USB-C hub / adapters', 1, false],
    ['Documents', 'Business cards', 20, false],
    ['Documents', 'Presentation materials', 1, false],
    ['Misc', 'Professional padfolio / notebook', 1, false],
  ],
  wellness: [
    ['Clothing', 'Workout clothes', 3, false],
    ['Clothing', 'Running shoes', 1, false],
    ['Gear', 'Resistance bands', 1, false],
    ['Misc', 'Foam roller / massage ball', 1, false],
    ['Misc', 'Yoga mat (or confirm availability)', 1, false],
  ],
  outdoor: [
    ['Clothing', 'Moisture-wicking athletic wear', 2, false],
    ['Toiletries', 'Sunscreen SPF 30+', 1, true],
    ['Clothing', 'Sun hat / cap', 1, false],
    ['Health', 'Bug spray', 1, false],
  ],
  dining: [
    ['Clothing', 'Smart casual outfit', 2, false],
    ['Documents', 'Restaurant reservation confirmations', 1, false],
  ],
  souvenirs: [
    ['Misc', 'Extra foldable duffel bag (for bringing souvenirs home)', 1, true],
    ['Misc', 'Bubble wrap or packing sleeves (for fragile items)', 1, false],
    ['Misc', 'Ziplock bags (to protect food souvenirs)', 3, false],
    ['Documents', 'Customs declaration info (know your duty-free limits)', 1, false],
  ],
};

const TRAVEL_METHOD_RULES: Record<string, FixedRule[]> = {
  flight: [
    ['Clothing', 'Comfortable travel outfit (layers)', 1, true],
    ['Misc', 'Luggage locks (TSA-approved)', 2, false],
    ['Misc', 'Travel pillow', 1, false],
    ['Electronics', 'Noise-cancelling headphones / earbuds', 1, false],
    ['Health', 'Compression socks (for long flights)', 1, false],
    ['Documents', 'Printed boarding passes (backup)', 1, false],
    ['Misc', 'Snacks for airport / flight', 3, false],
    ['Electronics', 'Power adapter / voltage converter', 1, false],
  ],
  road_trip: [
    ['Electronics', 'Car phone mount', 1, false],
    ['Electronics', 'Car charger / USB adapter', 1, true],
    ['Misc', 'Road trip snacks', 5, false],
    ['Misc', 'Reusable water bottles', 2, false],
    ['Misc', 'Car emergency kit (check if you have one)', 1, true],
    ['Misc', 'Paper maps / atlas (backup)', 1, false],
    ['Clothing', 'Comfortable driving shoes', 1, false],
  ],
  train: [
    ['Misc', 'Travel pillow', 1, false],
    ['Electronics', 'Headphones / earbuds', 1, false],
    ['Misc', 'Snacks for journey', 3, false],
    ['Documents', 'Printed tickets (backup)', 1, false],
  ],
  cruise: [
    ['Clothing', 'Formal / cocktail outfit (for formal nights)', 2, true],
    ['Clothing', 'Swimsuit', 2, true],
    ['Health', 'Sea-sickness bands / Dramamine', 1, false],
    ['Documents', 'Cruise card / booking documents', 1, true],
    ['Misc', 'Power strip (without surge protector - check cruise rules)', 1, false],
  ],
  backpacking: [
    ['Gear', 'Backpack (40-60L)', 1, true],
    ['Gear', 'Packing cubes / compression sacks', 3, true],
    ['Misc', 'Padlock for hostel lockers', 1, true],
    ['Clothing', 'Quick-dry microfiber towel', 1, true],
    ['Health', 'Water purification tablets or filter', 1, false],
    ['Electronics', 'Universal power adapter', 1, true],
    ['Misc', 'Ziplock bags (various sizes)', 5, false],
  ],
};

const ACCOMMODATION_RULES: Record<string, FixedRule[]> = {
  hostel: [
    ['Misc', 'Padlock for locker', 1, true],
    ['Clothing', 'Flip flops (for shared showers)', 1, true],
    ['Misc', 'Earplugs', 2, true],
    ['Misc', 'Eye mask', 1, false],
    ['Misc', 'Combination lock', 1, false],
    ['Misc', "Microfiber towel (hostels often don't provide)", 1, true],
  ],
  camping: [
    ['Gear', 'Tent', 1, true],
    ['Gear', 'Sleeping bag', 1, true],
    ['Gear', 'Sleeping pad', 1, true],
    ['Misc', 'Lantern / camp light', 1, true],
    ['Misc', 'Matches or lighter', 2, true],
  ],
  airbnb: [
    ['Misc', 'Check-in instructions / lockbox code', 1, true],
  ],
  cruise: [
    ['Clothing', 'Formal outfit (check cruise line dress code)', 1, true],
    ['Misc', 'Magnetic hooks for cabin walls', 4, false],
  ],
};

function durationDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  return Number.isFinite(days) ? Math.max(1, days) : 1;
}

function evalQuantity(formula: string, days: number, travelers: number): number {
  switch (formula) {
    case '1':
      return 1;
    case 'days':
      return days;
    case 'days*travelers':
      return days * travelers;
    case '(days+1)*travelers':
      return (days + 1) * travelers;
    case '(floor(days/2)+1)*travelers':
      return (Math.floor(days / 2) + 1) * travelers;
    default:
      return 1;
  }
}

function mergeRecommendation(
  recommendations: Map<string, PackingRecommendation>,
  category: string,
  item_name: string,
  quantity: number,
  essential: boolean,
  source: ItemSource,
  activity_type: string | null = null,
) {
  const key = item_name.trim().toLowerCase();
  const existing = recommendations.get(key);

  if (!existing) {
    recommendations.set(key, {
      category,
      item_name,
      quantity: Math.max(1, quantity),
      essential,
      source,
      activity_type,
    });
    return;
  }

  recommendations.set(key, {
    ...existing,
    quantity: Math.max(existing.quantity, quantity),
    essential: existing.essential || essential,
    source: existing.source === source ? existing.source : existing.source,
    activity_type: existing.activity_type ?? activity_type,
  });
}

export function generatePackingList(
  trip: PackingTripContext,
  weatherConditions: string[] = [],
  selectedActivityTypes: string[] = [],
): PackingRecommendation[] {
  const days = durationDays(trip.start_date, trip.end_date);
  const travelers = Math.max(1, trip.travelers || 1);
  const recommendations = new Map<string, PackingRecommendation>();

  for (const [category, itemName, quantity, essential] of ALWAYS_RULES) {
    mergeRecommendation(recommendations, category, itemName, quantity, essential, 'rule_engine');
  }

  for (const [minDays, category, itemName, formula, essential] of DURATION_RULES) {
    if (days >= minDays) {
      mergeRecommendation(
        recommendations,
        category,
        itemName,
        evalQuantity(formula, days, travelers),
        essential,
        'rule_engine',
      );
    }
  }

  for (const condition of weatherConditions) {
    for (const [category, itemName, quantity, essential] of WEATHER_RULES[condition] ?? []) {
      mergeRecommendation(recommendations, category, itemName, quantity, essential, 'rule_engine');
    }
  }

  for (const activityType of selectedActivityTypes) {
    for (const [category, itemName, quantity, essential] of ACTIVITY_RULES[activityType] ?? []) {
      mergeRecommendation(recommendations, category, itemName, quantity, essential, 'activity', activityType);
    }
  }

  for (const [category, itemName, quantity, essential] of TRAVEL_METHOD_RULES[trip.travel_method] ?? []) {
    mergeRecommendation(recommendations, category, itemName, quantity, essential, 'rule_engine');
  }

  for (const [category, itemName, quantity, essential] of ACCOMMODATION_RULES[trip.accommodation] ?? []) {
    mergeRecommendation(recommendations, category, itemName, quantity, essential, 'rule_engine');
  }

  return Array.from(recommendations.values());
}

export function generateActivityPackingItems(activityType: string): PackingRecommendation[] {
  return (ACTIVITY_RULES[activityType] ?? []).map(([category, item_name, quantity, essential]) => ({
    category,
    item_name,
    quantity,
    essential,
    source: 'activity',
    activity_type: activityType,
  }));
}

export function classifyWeather(avgTempCelsius: number, hasRain: boolean, hasSnow: boolean): string[] {
  const conditions: string[] = [];

  if (hasSnow) {
    conditions.push('snow');
  } else if (hasRain) {
    conditions.push('rain');
  }

  if (avgTempCelsius > 27) {
    conditions.push('hot');
  } else if (avgTempCelsius < 5) {
    conditions.push('cold');
  } else if (avgTempCelsius < 15) {
    conditions.push('cool');
  }

  return conditions;
}
