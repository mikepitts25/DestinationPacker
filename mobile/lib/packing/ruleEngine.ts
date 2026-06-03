import type { AccommodationType, ItemSource, TravelMethod, TravelerType, TripLeg } from '@/types';

export interface PackingTripContext {
  destination: string;
  start_date: string;
  end_date: string;
  accommodation: AccommodationType;
  travel_method: TravelMethod;
  travelers: number;
  male_travelers?: number;
  female_travelers?: number;
  children?: number;
  pets?: number;
  has_laundry_access?: boolean;
  legs?: TripLeg[];
}

export interface PackingRecommendation {
  category: string;
  item_name: string;
  quantity: number;
  essential: boolean;
  source: ItemSource;
  activity_type?: string | null;
  traveler_type: TravelerType;
}

type FixedQuantityScope = 'shared' | 'per_traveler';
type FixedRule = [
  category: string,
  itemName: string,
  quantity: number,
  essential: boolean,
  quantityScope?: FixedQuantityScope,
  travelerType?: TravelerType,
];
type FormulaRule = [minDays: number, category: string, itemName: string, formula: string, essential: boolean];

const ALWAYS_RULES: FixedRule[] = [
  ['Documents', 'Passport or ID', 1, true, 'per_traveler'],
  ['Documents', 'Travel insurance info', 1, true],
  ['Documents', 'Reservation confirmations', 1, true],
  ['Electronics', 'Phone charger', 1, true, 'per_traveler'],
  ['Electronics', 'Portable battery bank', 1, false],
  ['Toiletries', 'Toothbrush', 1, true, 'per_traveler'],
  ['Toiletries', 'Toothpaste', 1, true],
  ['Toiletries', 'Deodorant', 1, true, 'per_traveler'],
  ['Toiletries', 'Shampoo & conditioner', 1, false],
  ['Toiletries', 'Body wash / soap', 1, false],
  ['Toiletries', 'Face wash', 1, false, 'per_traveler'],
  ['Health', 'Prescription medications', 1, true, 'per_traveler'],
  ['Health', 'Pain reliever (ibuprofen/acetaminophen)', 1, false],
  ['Health', 'Antacids', 1, false],
  ['Health', 'Band-aids', 1, false],
  ['Clothing', 'Comfortable walking shoes', 1, true, 'per_traveler'],
  ['Clothing', 'Pajamas / sleepwear', 1, false, 'per_traveler'],
  ['Misc', 'Reusable water bottle', 1, false, 'per_traveler'],
  ['Misc', 'Small day bag / backpack', 1, false],
  ['Entertainment', 'Favorite book or e-reader', 1, false],
  ['Entertainment', 'Travel-size game / deck of cards', 1, false],
  ['Entertainment', 'Downloaded movies, podcasts, or playlists', 1, false],
  ['Entertainment', 'Journal or sketchbook', 1, false],
  ['Entertainment', 'Pen', 1, false],
  ['Entertainment', 'Offline maps / saved trip notes', 1, false],
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

const FEMALE_TRAVELER_RULES: FixedRule[] = [
  ['Clothing', 'Bras', 2, false, 'per_traveler', 'female'],
  ['Clothing', 'Dresses / skirts', 1, false, 'per_traveler', 'female'],
  ['Toiletries', 'Makeup / cosmetics bag', 1, false, 'shared', 'female'],
  ['Toiletries', 'Feminine hygiene products', 1, false, 'shared', 'female'],
];

const MALE_TRAVELER_RULES: FixedRule[] = [
  ['Toiletries', 'Razors / shaving kit', 1, false, 'shared', 'male'],
  ['Clothing', 'Collared shirt / smart casual top', 1, false, 'per_traveler', 'male'],
];

const CHILD_RULES: FixedRule[] = [
  ['Health', 'Kids sunscreen', 1, true, 'shared', 'child'],
  ['Misc', 'Child travel entertainment', 1, false, 'per_traveler', 'child'],
  ['Misc', 'Snacks for children', 3, false, 'per_traveler', 'child'],
  ['Health', 'Child medications', 1, true, 'shared', 'child'],
  ['Toiletries', 'Diapers / pull-ups if needed', 1, false, 'per_traveler', 'child'],
  ['Toiletries', 'Formula or child feeding supplies if needed', 1, false, 'shared', 'child'],
];

const PET_RULES: FixedRule[] = [
  ['Gear', 'Pet leash', 1, true, 'per_traveler', 'pet'],
  ['Gear', 'Pet food bowls', 1, true, 'per_traveler', 'pet'],
  ['Misc', 'Pet food and treats', 1, true, 'shared', 'pet'],
  ['Documents', 'Pet vaccination / travel documents', 1, true, 'shared', 'pet'],
  ['Health', 'Pet medications', 1, false, 'shared', 'pet'],
];

const WEATHER_RULES: Record<string, FixedRule[]> = {
  rain: [
    ['Clothing', 'Waterproof rain jacket', 1, true, 'per_traveler'],
    ['Clothing', 'Waterproof shoes / boots', 1, false, 'per_traveler'],
    ['Misc', 'Compact travel umbrella', 1, false],
    ['Clothing', 'Quick-dry pants', 1, false, 'per_traveler'],
  ],
  hot: [
    ['Toiletries', 'Sunscreen SPF 50+', 1, true],
    ['Clothing', 'Sunglasses', 1, true, 'per_traveler'],
    ['Clothing', 'Sun hat / cap', 1, false, 'per_traveler'],
    ['Clothing', 'Breathable shorts', 2, false, 'per_traveler'],
    ['Clothing', 'Sandals / flip flops', 1, false, 'per_traveler'],
    ['Misc', 'Electrolyte packets', 3, false],
    ['Misc', 'Reusable water bottle', 1, true, 'per_traveler'],
  ],
  cold: [
    ['Clothing', 'Heavy winter coat', 1, true, 'per_traveler'],
    ['Clothing', 'Thermal / base layers', 2, true, 'per_traveler'],
    ['Clothing', 'Warm gloves', 1, true, 'per_traveler'],
    ['Clothing', 'Knit hat / beanie', 1, true, 'per_traveler'],
    ['Clothing', 'Wool or thermal socks', 3, false, 'per_traveler'],
    ['Clothing', 'Winter boots', 1, false, 'per_traveler'],
    ['Clothing', 'Scarf', 1, false, 'per_traveler'],
  ],
  cool: [
    ['Clothing', 'Light jacket or fleece', 1, true, 'per_traveler'],
    ['Clothing', 'Layering long-sleeve shirts', 2, false, 'per_traveler'],
    ['Clothing', 'Light gloves', 1, false, 'per_traveler'],
  ],
  snow: [
    ['Clothing', 'Snow boots', 1, true, 'per_traveler'],
    ['Clothing', 'Waterproof winter coat', 1, true, 'per_traveler'],
    ['Clothing', 'Thermal base layers', 2, true, 'per_traveler'],
    ['Clothing', 'Warm gloves / mittens', 1, true, 'per_traveler'],
    ['Clothing', 'Neck gaiter / balaclava', 1, false, 'per_traveler'],
  ],
};

const ACTIVITY_RULES: Record<string, FixedRule[]> = {
  hiking: [
    ['Footwear', 'Hiking boots', 1, true, 'per_traveler'],
    ['Clothing', 'Moisture-wicking hiking socks', 3, true, 'per_traveler'],
    ['Clothing', 'Quick-dry hiking pants', 1, false, 'per_traveler'],
    ['Gear', 'Daypack / hiking backpack', 1, false, 'per_traveler'],
    ['Gear', 'Trekking poles', 1, false, 'per_traveler'],
    ['Health', 'Blister pads', 1, false],
    ['Health', 'Bug spray / insect repellent', 1, true],
    ['Toiletries', 'Sunscreen SPF 50+', 1, true],
    ['Misc', 'Trail snacks (bars, nuts)', 3, false, 'per_traveler'],
    ['Misc', 'Headlamp + extra batteries', 1, false, 'per_traveler'],
    ['Health', 'First aid kit', 1, true],
  ],
  beach: [
    ['Clothing', 'Swimsuit', 2, true, 'per_traveler'],
    ['Clothing', 'Beach cover-up', 1, false, 'per_traveler'],
    ['Misc', 'Beach towel', 1, true, 'per_traveler'],
    ['Toiletries', 'Sunscreen SPF 50+', 1, true],
    ['Clothing', 'Flip flops / sandals', 1, true, 'per_traveler'],
    ['Clothing', 'Sunglasses', 1, true, 'per_traveler'],
    ['Clothing', 'Sun hat', 1, false, 'per_traveler'],
    ['Misc', 'Waterproof bag / dry bag', 1, false],
  ],
  water: [
    ['Clothing', 'Swimsuit', 2, true, 'per_traveler'],
    ['Clothing', 'Rash guard', 1, false, 'per_traveler'],
    ['Clothing', 'Water shoes', 1, false, 'per_traveler'],
    ['Toiletries', 'Reef-safe sunscreen', 1, true],
    ['Misc', 'Waterproof phone case', 1, false, 'per_traveler'],
    ['Misc', 'Dry bag', 1, false],
  ],
  snow: [
    ['Gear', 'Ski / snowboard gear (or plan to rent)', 1, true, 'per_traveler'],
    ['Clothing', 'Ski goggles', 1, true, 'per_traveler'],
    ['Clothing', 'Ski helmet (or rent)', 1, true, 'per_traveler'],
    ['Clothing', 'Ski jacket', 1, true, 'per_traveler'],
    ['Clothing', 'Ski pants / bibs', 1, true, 'per_traveler'],
    ['Clothing', 'Moisture-wicking base layers', 2, true, 'per_traveler'],
    ['Clothing', 'Ski socks', 3, true, 'per_traveler'],
    ['Clothing', 'Warm gloves / mittens', 1, true, 'per_traveler'],
    ['Misc', 'Hand warmers', 4, false, 'per_traveler'],
    ['Toiletries', 'Lip balm with SPF', 1, false, 'per_traveler'],
    ['Toiletries', 'High SPF sunscreen (sun reflects off snow)', 1, true],
  ],
  camping: [
    ['Gear', 'Tent', 1, true],
    ['Gear', 'Sleeping bag', 1, true, 'per_traveler'],
    ['Gear', 'Sleeping pad / inflatable mat', 1, false, 'per_traveler'],
    ['Gear', 'Camp stove + fuel', 1, false],
    ['Gear', 'Camp cookware set', 1, false],
    ['Gear', 'Headlamp + extra batteries', 1, true, 'per_traveler'],
    ['Gear', 'Multi-tool / pocket knife', 1, false],
    ['Clothing', 'Warm fleece jacket', 1, true, 'per_traveler'],
    ['Clothing', 'Rain jacket', 1, true, 'per_traveler'],
    ['Health', 'Bug spray', 1, true],
    ['Toiletries', 'Biodegradable soap', 1, false],
    ['Misc', 'Camp chairs (if backpacking: skip)', 1, false],
    ['Misc', 'Matches / lighter', 2, true],
    ['Misc', 'Bear canister (check local rules)', 1, false],
  ],
  cultural: [],
  theater: [
    ['Clothing', 'Smart evening outfit', 1, false, 'per_traveler'],
    ['Clothing', 'Dress shoes / polished flats', 1, false, 'per_traveler'],
  ],
  place_of_worship: [
    ['Clothing', 'Modest / respectful attire (cover shoulders & knees)', 1, true, 'per_traveler'],
    ['Clothing', 'Light scarf or shoulder cover', 1, false, 'per_traveler'],
  ],
  nightlife: [
    ['Clothing', 'Going-out outfit', 2, true, 'per_traveler'],
    ['Clothing', 'Dress shoes / heels', 1, false, 'per_traveler'],
    ['Misc', 'Small clutch / evening bag', 1, false, 'per_traveler'],
    ['Health', 'Earplugs (for light sleepers)', 1, false],
  ],
  business: [
    ['Clothing', 'Business attire (shirts, trousers/skirt)', 3, true, 'per_traveler'],
    ['Clothing', 'Dress shoes', 1, true, 'per_traveler'],
    ['Clothing', 'Blazer / sport coat', 1, true, 'per_traveler'],
    ['Electronics', 'Laptop + charger', 1, true, 'per_traveler'],
    ['Electronics', 'USB-C hub / adapters', 1, false, 'per_traveler'],
    ['Documents', 'Business cards', 20, false],
    ['Documents', 'Presentation materials', 1, false],
    ['Misc', 'Professional padfolio / notebook', 1, false, 'per_traveler'],
  ],
  wellness: [
    ['Clothing', 'Workout clothes', 3, false, 'per_traveler'],
    ['Clothing', 'Running shoes', 1, false, 'per_traveler'],
    ['Gear', 'Resistance bands', 1, false, 'per_traveler'],
    ['Misc', 'Foam roller / massage ball', 1, false, 'per_traveler'],
    ['Misc', 'Yoga mat (or confirm availability)', 1, false, 'per_traveler'],
  ],
  outdoor: [
    ['Clothing', 'Moisture-wicking athletic wear', 2, false, 'per_traveler'],
    ['Toiletries', 'Sunscreen SPF 30+', 1, true],
    ['Clothing', 'Sun hat / cap', 1, false, 'per_traveler'],
    ['Health', 'Bug spray', 1, false],
  ],
  dining: [
    ['Clothing', 'Smart casual outfit', 2, false, 'per_traveler'],
    ['Documents', 'Restaurant reservation confirmations', 1, false],
  ],
  souvenirs: [
    ['Misc', 'Extra foldable duffel bag (for bringing souvenirs home)', 1, true],
    ['Misc', 'Bubble wrap or packing sleeves (for fragile items)', 1, false],
    ['Misc', 'Ziplock bags (to protect food souvenirs)', 3, false],
    ['Documents', 'Customs declaration info (know your duty-free limits)', 1, false],
  ],
  family: [
    ['Misc', 'Child travel entertainment', 1, false, 'per_traveler', 'child'],
    ['Health', 'Kids sunscreen', 1, true, 'shared', 'child'],
    ['Misc', 'Compact stroller or carrier if needed', 1, false, 'shared', 'child'],
  ],
  adventure: [
    ['Gear', 'Activity waiver / booking confirmations', 1, true],
    ['Health', 'Compact first aid kit', 1, true],
    ['Gear', 'Protective gloves', 1, false, 'per_traveler'],
  ],
  shopping: [
    ['Misc', 'Extra foldable tote bag', 1, false],
    ['Documents', 'Receipts envelope for customs', 1, false],
  ],
  sports: [
    ['Clothing', 'Athletic wear', 2, false, 'per_traveler'],
    ['Misc', 'Reusable water bottle', 1, true, 'per_traveler'],
  ],
};

const TRAVEL_METHOD_RULES: Record<string, FixedRule[]> = {
  flight: [
    ['Clothing', 'Comfortable travel outfit (layers)', 1, true, 'per_traveler'],
    ['Misc', 'Luggage locks (TSA-approved)', 2, false],
    ['Misc', 'Travel pillow', 1, false, 'per_traveler'],
    ['Electronics', 'Noise-cancelling headphones / earbuds', 1, false, 'per_traveler'],
    ['Health', 'Compression socks (for long flights)', 1, false, 'per_traveler'],
    ['Documents', 'Printed boarding passes (backup)', 1, false, 'per_traveler'],
    ['Misc', 'Snacks for airport / flight', 3, false, 'per_traveler'],
    ['Electronics', 'Power adapter / voltage converter', 1, false, 'per_traveler'],
  ],
  road_trip: [
    ['Electronics', 'Car phone mount', 1, false],
    ['Electronics', 'Car charger / USB adapter', 1, true],
    ['Misc', 'Road trip snacks', 5, false],
    ['Misc', 'Reusable water bottles', 1, false, 'per_traveler'],
    ['Misc', 'Car emergency kit (check if you have one)', 1, true],
    ['Misc', 'Paper maps / atlas (backup)', 1, false],
    ['Clothing', 'Comfortable driving shoes', 1, false, 'per_traveler'],
  ],
  train: [
    ['Misc', 'Travel pillow', 1, false, 'per_traveler'],
    ['Electronics', 'Headphones / earbuds', 1, false, 'per_traveler'],
    ['Misc', 'Snacks for journey', 3, false, 'per_traveler'],
    ['Documents', 'Printed tickets (backup)', 1, false, 'per_traveler'],
  ],
  cruise: [
    ['Clothing', 'Formal / cocktail outfit (for formal nights)', 2, true, 'per_traveler'],
    ['Clothing', 'Swimsuit', 2, true, 'per_traveler'],
    ['Health', 'Sea-sickness bands / Dramamine', 1, false, 'per_traveler'],
    ['Documents', 'Cruise card / booking documents', 1, true],
    ['Misc', 'Power strip (without surge protector - check cruise rules)', 1, false],
  ],
  backpacking: [
    ['Gear', 'Backpack (40-60L)', 1, true, 'per_traveler'],
    ['Gear', 'Packing cubes / compression sacks', 3, true, 'per_traveler'],
    ['Misc', 'Padlock for hostel lockers', 1, true, 'per_traveler'],
    ['Clothing', 'Quick-dry microfiber towel', 1, true, 'per_traveler'],
    ['Health', 'Water purification tablets or filter', 1, false, 'per_traveler'],
    ['Electronics', 'Universal power adapter', 1, true, 'per_traveler'],
    ['Misc', 'Ziplock bags (various sizes)', 5, false],
  ],
};

const ACCOMMODATION_RULES: Record<string, FixedRule[]> = {
  hostel: [
    ['Misc', 'Padlock for locker', 1, true, 'per_traveler'],
    ['Clothing', 'Flip flops (for shared showers)', 1, true, 'per_traveler'],
    ['Misc', 'Earplugs', 2, true, 'per_traveler'],
    ['Misc', 'Eye mask', 1, false, 'per_traveler'],
    ['Misc', 'Combination lock', 1, false, 'per_traveler'],
    ['Misc', "Microfiber towel (hostels often don't provide)", 1, true, 'per_traveler'],
  ],
  camping: [
    ['Gear', 'Tent', 1, true],
    ['Gear', 'Sleeping bag', 1, true, 'per_traveler'],
    ['Gear', 'Sleeping pad', 1, true, 'per_traveler'],
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

function fixedQuantity(quantity: number, scope: FixedQuantityScope | undefined, travelers: number): number {
  return scope === 'per_traveler' ? quantity * travelers : quantity;
}

function mergeRecommendation(
  recommendations: Map<string, PackingRecommendation>,
  category: string,
  item_name: string,
  quantity: number,
  essential: boolean,
  source: ItemSource,
  activity_type: string | null = null,
  traveler_type: TravelerType = 'shared',
) {
  const key = `${traveler_type}:${item_name.trim().toLowerCase()}`;
  const existing = recommendations.get(key);

  if (!existing) {
    recommendations.set(key, {
      category,
      item_name,
      quantity: Math.max(1, quantity),
      essential,
      source,
      activity_type,
      traveler_type,
    });
    return;
  }

  recommendations.set(key, {
    ...existing,
    quantity: Math.max(existing.quantity, quantity),
    essential: existing.essential || essential,
    source: existing.source === source ? existing.source : existing.source,
    activity_type: existing.activity_type ?? activity_type,
    traveler_type: existing.traveler_type,
  });
}

function tripLegs(trip: PackingTripContext): TripLeg[] {
  return trip.legs && trip.legs.length > 0
    ? trip.legs
    : [{
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      accommodation: trip.accommodation,
      travel_method: trip.travel_method,
    }];
}

function humanTravelers(trip: PackingTripContext): number {
  const adults = Math.max(0, trip.male_travelers ?? 0) + Math.max(0, trip.female_travelers ?? 0);
  const children = Math.max(0, trip.children ?? 0);
  return Math.max(1, trip.travelers || 1, adults + children);
}

export function generatePackingList(
  trip: PackingTripContext,
  weatherConditions: string[] = [],
  selectedActivityTypes: string[] = [],
): PackingRecommendation[] {
  const days = durationDays(trip.start_date, trip.end_date);
  const packingDays = trip.has_laundry_access ? Math.min(days, 7) : days;
  const travelers = humanTravelers(trip);
  const recommendations = new Map<string, PackingRecommendation>();

  for (const [category, itemName, quantity, essential, quantityScope, travelerType] of ALWAYS_RULES) {
    mergeRecommendation(
      recommendations,
      category,
      itemName,
      fixedQuantity(quantity, quantityScope, travelers),
      essential,
      'rule_engine',
      null,
      travelerType ?? 'shared',
    );
  }

  for (const [minDays, category, itemName, formula, essential] of DURATION_RULES) {
    if (days >= minDays) {
      mergeRecommendation(
        recommendations,
        category,
        itemName,
        evalQuantity(formula, packingDays, travelers),
        essential,
        'rule_engine',
      );
    }
  }

  const maleTravelers = Math.max(0, trip.male_travelers ?? 0);
  if (maleTravelers > 0) {
    for (const [category, itemName, quantity, essential, quantityScope, travelerType] of MALE_TRAVELER_RULES) {
      mergeRecommendation(
        recommendations,
        category,
        itemName,
        fixedQuantity(quantity, quantityScope, maleTravelers),
        essential,
        'rule_engine',
        null,
        travelerType ?? 'male',
      );
    }
  }

  const femaleTravelers = Math.max(0, trip.female_travelers ?? 0);
  if (femaleTravelers > 0) {
    for (const [category, itemName, quantity, essential, quantityScope, travelerType] of FEMALE_TRAVELER_RULES) {
      mergeRecommendation(
        recommendations,
        category,
        itemName,
        fixedQuantity(quantity, quantityScope, femaleTravelers),
        essential,
        'rule_engine',
        null,
        travelerType ?? 'female',
      );
    }
  }

  const children = Math.max(0, trip.children ?? 0);
  if (children > 0) {
    for (const [category, itemName, quantity, essential, quantityScope, travelerType] of CHILD_RULES) {
      mergeRecommendation(
        recommendations,
        category,
        itemName,
        fixedQuantity(quantity, quantityScope, children),
        essential,
        'rule_engine',
        null,
        travelerType ?? 'child',
      );
    }
  }

  const pets = Math.max(0, trip.pets ?? 0);
  if (pets > 0) {
    for (const [category, itemName, quantity, essential, quantityScope, travelerType] of PET_RULES) {
      mergeRecommendation(
        recommendations,
        category,
        itemName,
        fixedQuantity(quantity, quantityScope, pets),
        essential,
        'rule_engine',
        null,
        travelerType ?? 'pet',
      );
    }
  }

  for (const condition of weatherConditions) {
    for (const [category, itemName, quantity, essential, quantityScope, travelerType] of WEATHER_RULES[condition] ?? []) {
      mergeRecommendation(
        recommendations,
        category,
        itemName,
        fixedQuantity(quantity, quantityScope, travelers),
        essential,
        'rule_engine',
        null,
        travelerType ?? 'shared',
      );
    }
  }

  for (const activityType of selectedActivityTypes) {
    for (const [category, itemName, quantity, essential, quantityScope, travelerType] of ACTIVITY_RULES[activityType] ?? []) {
      mergeRecommendation(
        recommendations,
        category,
        itemName,
        fixedQuantity(quantity, quantityScope, travelers),
        essential,
        'activity',
        activityType,
        travelerType ?? 'shared',
      );
    }
  }

  const legs = tripLegs(trip);
  for (const leg of legs) {
    for (const [category, itemName, quantity, essential, quantityScope, travelerType] of TRAVEL_METHOD_RULES[leg.travel_method] ?? []) {
      mergeRecommendation(
        recommendations,
        category,
        itemName,
        fixedQuantity(quantity, quantityScope, travelers),
        essential,
        'rule_engine',
        null,
        travelerType ?? 'shared',
      );
    }

    for (const [category, itemName, quantity, essential, quantityScope, travelerType] of ACCOMMODATION_RULES[leg.accommodation] ?? []) {
      mergeRecommendation(
        recommendations,
        category,
        itemName,
        fixedQuantity(quantity, quantityScope, travelers),
        essential,
        'rule_engine',
        null,
        travelerType ?? 'shared',
      );
    }
  }

  return Array.from(recommendations.values());
}

export function packingActivityKeysForActivity(activity: {
  activity_type: string;
  activity_name?: string | null;
  description?: string | null;
}): string[] {
  const text = `${activity.activity_name ?? ''} ${activity.description ?? ''}`.toLowerCase();
  const keys = new Set<string>();

  if (['beach', 'water', 'snow', 'business', 'wellness', 'outdoor', 'dining', 'nightlife', 'souvenirs'].includes(activity.activity_type)) {
    keys.add(activity.activity_type);
  }
  if (['family', 'adventure', 'shopping', 'sports'].includes(activity.activity_type)) {
    keys.add(activity.activity_type);
  }

  if (activity.activity_type === 'cultural') {
    if (/(theater|theatre|opera|ballet|concert|cinema|show)/.test(text)) keys.add('theater');
    if (/(church|cathedral|mosque|synagogue|temple|shrine|place_of_worship|place of worship)/.test(text)) {
      keys.add('place_of_worship');
    }
  }

  return Array.from(keys);
}

export function generateActivityPackingItems(activityType: string, travelers = 1): PackingRecommendation[] {
  const travelerCount = Math.max(1, travelers || 1);

  return (ACTIVITY_RULES[activityType] ?? []).map(([category, item_name, quantity, essential, quantityScope, travelerType]) => ({
    category,
    item_name,
    quantity: fixedQuantity(quantity, quantityScope, travelerCount),
    essential,
    source: 'activity',
    activity_type: activityType,
    traveler_type: travelerType ?? 'shared',
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
