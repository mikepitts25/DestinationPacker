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
};

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

function destinationKeywords(destination: string): string[] {
  const normalized = destination.trim().toLowerCase();
  return Object.keys({ ...CUSTOMS_BY_KEYWORD, ...PRACTICAL_BY_KEYWORD }).filter((keyword) => (
    normalized.includes(keyword)
  ));
}

function stripGuidePrefix(value: string): string {
  const stripped = value.replace(/^(Try|Buy):\s*/i, '').trim();
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
  };
}
