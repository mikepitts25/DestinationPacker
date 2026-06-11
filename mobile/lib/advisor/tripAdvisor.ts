import { localActivitySuggestionsForDestination } from '@/lib/activities/localSuggestions';

export type AdvisorItem = {
  title: string;
  description: string;
};

export type TripAdvisorGuide = {
  foods: AdvisorItem[];
  souvenirs: AdvisorItem[];
  customs: AdvisorItem[];
  practical: AdvisorItem[];
  booking: AdvisorItem[];
  buying: AdvisorItem[];
  safety: AdvisorItem[];
};

export type DestinationAdvisorGuide = {
  destination: string;
  guide: TripAdvisorGuide;
};

const SHARE_SECTIONS: { key: keyof TripAdvisorGuide; title: string }[] = [
  { key: 'foods', title: 'Foods to try' },
  { key: 'souvenirs', title: 'Souvenirs' },
  { key: 'customs', title: 'Customs' },
  { key: 'practical', title: 'Practical notes' },
  { key: 'booking', title: 'Book ahead' },
  { key: 'buying', title: 'Before you buy' },
  { key: 'safety', title: 'Safety and comfort' },
];

const CUSTOMS_BY_KEYWORD: Record<string, AdvisorItem[]> = {
  berlin: [
    {
      title: 'Cash is still useful',
      description: 'Many places accept cards, but small food stands, markets, and neighborhood spots may prefer cash.',
    },
    {
      title: 'Validate transit tickets',
      description: 'Paper public-transport tickets need validation before travel when they are not already time-stamped.',
    },
  ],
  germany: [
    {
      title: 'Cash is still useful',
      description: 'Carry some euros for bakeries, markets, kiosks, and smaller restaurants.',
    },
    {
      title: 'Quiet hours',
      description: 'Residential quiet hours are taken seriously, especially late evening and Sundays.',
    },
  ],
  budapest: [
    {
      title: 'Bathhouse etiquette',
      description: 'Bring swimwear and check whether towels, swim caps, or slippers are required at the bath you choose.',
    },
  ],
  hungary: [
    {
      title: 'Forint pricing',
      description: 'Hungary uses the forint; card payment is common, but small markets may be easier with cash.',
    },
  ],
  'sri lanka': [
    {
      title: 'Temple etiquette',
      description: 'Cover shoulders and knees, remove shoes and hats, and avoid turning your back to Buddha statues for photos.',
    },
    {
      title: 'Use your right hand',
      description: 'Use the right hand for eating, giving, and receiving when practical.',
    },
  ],
  japan: [
    {
      title: 'Cash and quiet transit',
      description: 'Carry cash for smaller shops and keep calls quiet or off on trains.',
    },
    {
      title: 'No tipping',
      description: 'Tipping is not expected in most restaurants, taxis, or hotels.',
    },
  ],
};

const PRACTICAL_BY_KEYWORD: Record<string, AdvisorItem[]> = {
  berlin: [
    {
      title: 'Sunday closures',
      description: 'Most shops close on Sundays; plan groceries, pharmacy stops, and shopping ahead.',
    },
    {
      title: 'Museum booking',
      description: 'Book popular museum and Reichstag slots ahead when traveling during busy periods.',
    },
  ],
  germany: [
    {
      title: 'Bottle deposit',
      description: 'Many bottles include a Pfand deposit; return them to machines in supermarkets.',
    },
  ],
  budapest: [
    {
      title: 'Thermal bath kit',
      description: 'Pack swimwear, sandals, and a small dry bag if you plan to visit the baths.',
    },
  ],
  hungary: [
    {
      title: 'Market halls',
      description: 'Central market halls are good for paprika, sweets, and small food gifts.',
    },
  ],
  'sri lanka': [
    {
      title: 'Train tickets',
      description: 'Scenic train routes can sell out; reserve seats early when the route matters.',
    },
    {
      title: 'Monsoon checks',
      description: 'Rain patterns vary by coast and season, so confirm the local forecast before beach or hill-country plans.',
    },
  ],
  japan: [
    {
      title: 'Luggage forwarding',
      description: 'Takkyubin luggage delivery can make multi-city trips easier and is common between hotels.',
    },
  ],
};

const BOOKING_BY_KEYWORD: Record<string, AdvisorItem[]> = {
  berlin: [
    {
      title: 'Reichstag and museum slots',
      description: 'Book Reichstag dome visits and major museum entry windows ahead when dates are fixed.',
    },
    {
      title: 'Transit passes',
      description: 'Compare day passes with single tickets if you plan several U-Bahn, S-Bahn, tram, or bus rides.',
    },
  ],
  germany: [
    {
      title: 'Sunday planning',
      description: 'Plan shopping, pharmacies, and grocery runs around Sunday closures and public holidays.',
    },
    {
      title: 'Train reservations',
      description: 'Long-distance trains can sell out or run crowded; reserve seats for longer legs when comfort matters.',
    },
  ],
  budapest: [
    {
      title: 'Thermal bath tickets',
      description: 'Reserve popular bath sessions and check towel, locker, and swim-cap rules before arrival.',
    },
  ],
  hungary: [
    {
      title: 'Market hall timing',
      description: 'Visit market halls earlier in the day for better food and souvenir selection.',
    },
  ],
  'sri lanka': [
    {
      title: 'Scenic train seats',
      description: 'Reserve scenic train routes as early as practical, especially hill-country segments.',
    },
    {
      title: 'Driver or transfer days',
      description: 'Leave buffer time for road transfers, weather delays, and slower mountain or coastal routes.',
    },
  ],
  japan: [
    {
      title: 'Restaurant and museum windows',
      description: 'Book small restaurants, popular museums, and timed attractions ahead when they are central to the trip.',
    },
    {
      title: 'Luggage forwarding timing',
      description: 'Send bags at least a day ahead when using takkyubin between cities or hotels.',
    },
  ],
  italy: [
    {
      title: 'Timed museum entry',
      description: 'Reserve major museums, cathedral climbs, archaeological sites, or popular cooking classes once dates are fixed.',
    },
  ],
  france: [
    {
      title: 'Museum and tasting reservations',
      description: 'Book major museums, chateaux, wine tastings, and restaurant meals ahead during busy travel periods.',
    },
  ],
  thailand: [
    {
      title: 'Cooking classes and ethical tours',
      description: 'Book smaller cooking classes, guides, or wildlife-related experiences after checking recent reviews and standards.',
    },
  ],
  belgium: [
    {
      title: 'Chocolate workshops',
      description: 'Reserve hands-on chocolate classes in advance, especially around weekends and school holidays.',
    },
  ],
};

const BUYING_BY_KEYWORD: Record<string, AdvisorItem[]> = {
  germany: [
    {
      title: 'Food and alcohol limits',
      description: 'Before packing beer, sausage, cheese, seeds, or wood items, check your home country import rules.',
    },
    {
      title: 'VAT and receipts',
      description: 'Keep receipts for higher-value goods and ask retailers about tax-free shopping when eligible.',
    },
  ],
  'sri lanka': [
    {
      title: 'Tea, spices, and natural products',
      description: 'Seal tea and spices well, keep receipts, and check rules before bringing plant, wood, or animal products home.',
    },
  ],
  japan: [
    {
      title: 'Knives and liquids',
      description: 'Kitchen knives must travel in checked luggage, and liquids or sauces need normal airline packing care.',
    },
    {
      title: 'Tax-free purchases',
      description: 'Keep tax-free purchase receipts and sealed packages as instructed by the shop.',
    },
  ],
  italy: [
    {
      title: 'Oil, wine, cheese, and meat',
      description: 'Pack liquids carefully in checked luggage and verify import rules before buying cheese, cured meats, seeds, or plants.',
    },
  ],
  france: [
    {
      title: 'Wine, cheese, and cosmetics',
      description: 'Confirm liquid limits, checked-bag packing, and food import rules before buying bottles, cheese, or specialty foods.',
    },
  ],
  thailand: [
    {
      title: 'Silk, spices, and carvings',
      description: 'Buy from reputable shops, keep receipts, and verify restrictions before packing wood, shells, plants, or animal products.',
    },
  ],
  belgium: [
    {
      title: 'Chocolate packing',
      description: 'Pack chocolate away from heat and confirm food import rules before bringing large quantities home.',
    },
  ],
  morocco: [
    {
      title: 'Rugs, oils, and spices',
      description: 'Keep receipts, compare quality, and verify home-country rules before packing plants, oils, wood, or animal-derived goods.',
    },
  ],
};

const SAFETY_BY_KEYWORD: Record<string, AdvisorItem[]> = {
  berlin: [
    {
      title: 'Ticket checks are common',
      description: 'Keep validated transit tickets accessible; inspections can happen without station barriers.',
    },
  ],
  germany: [
    {
      title: 'Bike lanes and crossings',
      description: 'Watch for bike lanes before stepping off curbs and follow crossing signals in cities.',
    },
  ],
  budapest: [
    {
      title: 'Bathhouse comfort',
      description: 'Bring sandals and a small dry bag, and avoid long hot-water sessions if heat affects you.',
    },
  ],
  'sri lanka': [
    {
      title: 'Water and sun',
      description: 'Use safe drinking water, carry sun protection, and pace hill-country or beach days around heat and rain.',
    },
  ],
  japan: [
    {
      title: 'Heat and transit fatigue',
      description: 'Summer heat, station transfers, and crowds can be tiring; carry water and plan breaks between dense stops.',
    },
  ],
  thailand: [
    {
      title: 'Heat, scooters, and water',
      description: 'Prioritize hydration, safe drinking water, and cautious transport choices, especially around scooters or busy roads.',
    },
  ],
  italy: [
    {
      title: 'Heat and old streets',
      description: 'Expect sun, stairs, and uneven stone streets in historic centers; comfortable shoes matter.',
    },
  ],
  france: [
    {
      title: 'Crowds and pickpockets',
      description: 'Use normal city caution around crowded transit, major landmarks, markets, and nightlife areas.',
    },
  ],
};

function destinationKeywords(destination: string): string[] {
  const normalized = destination.trim().toLowerCase();
  return Object.keys({
    ...CUSTOMS_BY_KEYWORD,
    ...PRACTICAL_BY_KEYWORD,
    ...BOOKING_BY_KEYWORD,
    ...BUYING_BY_KEYWORD,
    ...SAFETY_BY_KEYWORD,
  }).filter((keyword) => (
    normalized.includes(keyword)
  ));
}

function stripGuidePrefix(value: string): string {
  const stripped = value.replace(/^(Try|Buy|Experience):\s*/i, '').trim();
  return stripped.toLowerCase() === 'browse local markets for souvenirs'
    ? 'Local markets'
    : stripped;
}

function uniqueItems(items: AdvisorItem[]): AdvisorItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function foodAndSouvenirItems(destination: string): Pick<TripAdvisorGuide, 'foods' | 'souvenirs'> {
  const suggestions = localActivitySuggestionsForDestination(destination);
  const foods = suggestions
    .filter((suggestion) => suggestion.activity_type === 'dining')
    .map((suggestion) => ({
      title: stripGuidePrefix(suggestion.activity_name),
      description: suggestion.description ?? `Try a local specialty in ${destination}.`,
    }));
  const souvenirs = suggestions
    .filter((suggestion) => suggestion.activity_type === 'souvenirs')
    .map((suggestion) => ({
      title: stripGuidePrefix(suggestion.activity_name),
      description: suggestion.description ?? `Look for a small local souvenir from ${destination}.`,
    }));

  return {
    foods: foods.length > 0 ? uniqueItems(foods) : [{
      title: 'Ask for a local specialty',
      description: `Check bakeries, markets, or casual restaurants for foods specific to ${destination}.`,
    }],
    souvenirs: souvenirs.length > 0 ? uniqueItems(souvenirs) : [{
      title: 'Local markets',
      description: `Browse local markets for crafts, shelf-stable foods, and small gifts typical of ${destination}.`,
    }],
  };
}

function buyingFallback(destination: string, souvenirs: AdvisorItem[]): AdvisorItem[] {
  const souvenirTitles = souvenirs.slice(0, 2).map((item) => item.title).join(' and ');

  return [
    {
      title: 'Check what can come home',
      description: souvenirTitles
        ? `Before buying ${souvenirTitles}, confirm your airline packing limits and home-country customs rules.`
        : `Before buying food, seeds, wood, plants, shells, or animal products in ${destination}, confirm what you can bring home.`,
    },
    {
      title: 'Keep receipts',
      description: 'Receipts help with tax-free shopping, warranty questions, and customs declarations for higher-value purchases.',
    },
  ];
}

function sectionForKeywords(
  keywords: string[],
  source: Record<string, AdvisorItem[]>,
  fallback: AdvisorItem[],
): AdvisorItem[] {
  const items = keywords.flatMap((keyword) => source[keyword] ?? []);
  return items.length > 0 ? uniqueItems(items) : fallback;
}

export function tripAdvisorGuideForDestination(destination: string): TripAdvisorGuide {
  const keywords = destinationKeywords(destination);
  const { foods, souvenirs } = foodAndSouvenirItems(destination);

  return {
    foods,
    souvenirs,
    customs: sectionForKeywords(keywords, CUSTOMS_BY_KEYWORD, [
      {
        title: 'Ask before photographing people',
        description: 'When in doubt, ask permission before taking close photos of people, private spaces, or ceremonies.',
      },
      {
        title: 'Learn basic greetings',
        description: 'A simple hello, thank you, and excuse me in the local language helps in markets and small shops.',
      },
    ]),
    practical: sectionForKeywords(keywords, PRACTICAL_BY_KEYWORD, [
      {
        title: 'Check import rules',
        description: 'Before buying food, seeds, wood, or animal products, confirm what you can bring home.',
      },
      {
        title: 'Keep small cash',
        description: 'Carry a small amount of local currency for transit, tips where customary, markets, or cash-only spots.',
      },
    ]),
    booking: sectionForKeywords(keywords, BOOKING_BY_KEYWORD, [
      {
        title: 'Book must-do experiences early',
        description: `Reserve timed museums, food classes, tastings, popular viewpoints, or guided tours in ${destination} once dates are firm.`,
      },
      {
        title: 'Check closure days',
        description: 'Confirm opening days, public holidays, seasonal closures, and last-entry times before building the daily plan.',
      },
    ]),
    buying: sectionForKeywords(keywords, BUYING_BY_KEYWORD, buyingFallback(destination, souvenirs)),
    safety: sectionForKeywords(keywords, SAFETY_BY_KEYWORD, [
      {
        title: 'Build in buffer time',
        description: 'Leave room for transit delays, weather changes, slower meals, and rest breaks instead of stacking every day tightly.',
      },
      {
        title: 'Protect documents and payment options',
        description: 'Carry backup payment, keep digital copies of key documents, and avoid keeping all cards and cash in one place.',
      },
    ]),
  };
}

export function buildTripAdvisorShareText(destinationGuides: DestinationAdvisorGuide[]) {
  const destinations = destinationGuides.map((entry) => entry.destination).join(' -> ');
  const lines = [
    `DestinationPacker trip briefing${destinations ? ` for ${destinations}` : ''}`,
    '',
  ];

  for (const { destination, guide } of destinationGuides) {
    lines.push(destination);
    lines.push('-'.repeat(Math.min(destination.length, 48)));

    for (const section of SHARE_SECTIONS) {
      const items = guide[section.key].slice(0, 3);
      if (items.length === 0) continue;
      lines.push(section.title);
      for (const item of items) {
        lines.push(`- ${item.title}: ${item.description}`);
      }
      lines.push('');
    }
  }

  lines.push('Verify opening times, booking windows, and official customs/import rules before departure.');

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
