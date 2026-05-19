import type { Activity, ActivityType } from '@/types';

export type ActivitySuggestion =
  Omit<Activity, 'id' | 'trip_id' | 'selected' | 'rating' | 'review_count' | 'rating_source' | 'distance_from_center_km'>
  & {
    rating?: number | null;
    review_count?: number | null;
    rating_source?: string | null;
    distance_from_center_km?: number | null;
  };

type LocalSuggestion = {
  name: string;
  activity_type: ActivityType;
  description: string;
};

const LOCAL_SUGGESTIONS: Record<string, LocalSuggestion[]> = {
  berlin: [
    {
      name: 'Try: Berliner Pfannkuchen',
      activity_type: 'dining',
      description: 'A jam-filled doughnut-like pastry. In Berlin it is usually called a Pfannkuchen.',
    },
    {
      name: 'Try: Currywurst',
      activity_type: 'dining',
      description: 'A classic Berlin street food: sliced sausage with curry ketchup, usually served with fries.',
    },
    {
      name: 'Buy: Ampelmann souvenir',
      activity_type: 'souvenirs',
      description: 'The East Berlin traffic-light figure appears on mugs, magnets, bags, and other small keepsakes.',
    },
  ],
  budapest: [
    {
      name: 'Buy: Hungarian paprika',
      activity_type: 'souvenirs',
      description: 'Sweet or hot paprika is a practical Hungarian souvenir from market halls and specialty food shops.',
    },
    {
      name: 'Try: Chimney cake',
      activity_type: 'dining',
      description: 'Kurtoskalacs is a warm spiral pastry often rolled in cinnamon, walnut, cocoa, or vanilla sugar.',
    },
    {
      name: 'Try: Tokaji wine',
      activity_type: 'dining',
      description: 'Hungary is known for Tokaji dessert wine; look for tastings or small bottles to bring home.',
    },
  ],
  hungary: [
    {
      name: 'Buy: Hungarian paprika',
      activity_type: 'souvenirs',
      description: 'Sweet or hot paprika is a practical Hungarian souvenir from market halls and specialty food shops.',
    },
    {
      name: 'Buy: Tokaji wine',
      activity_type: 'souvenirs',
      description: "Tokaji is Hungary's famous golden dessert wine and is easy to pack in a checked bag.",
    },
  ],
  'sri lanka': [
    {
      name: 'Buy: Ceylon tea',
      activity_type: 'souvenirs',
      description: 'Sri Lanka is famous for Ceylon tea; tea shops often carry regional black, green, and white teas.',
    },
    {
      name: 'Try: Hoppers',
      activity_type: 'dining',
      description: 'Bowl-shaped rice flour pancakes served plain, with egg, or alongside curry and sambols.',
    },
    {
      name: 'Buy: Ceylon cinnamon',
      activity_type: 'souvenirs',
      description: 'True Ceylon cinnamon is lighter and more delicate than cassia and travels well as a food souvenir.',
    },
  ],
  germany: [
    {
      name: 'Buy: German beer stein',
      activity_type: 'souvenirs',
      description: 'Ceramic or stoneware steins are a classic German keepsake, especially from Bavaria.',
    },
    {
      name: 'Buy: Christmas ornaments',
      activity_type: 'souvenirs',
      description: 'Handmade ornaments are easy to pack and are especially common around winter markets.',
    },
  ],
  japan: [
    {
      name: 'Buy: Matcha and tea set',
      activity_type: 'souvenirs',
      description: 'Ceremonial matcha and small tea tools are useful, compact, and widely available in Japan.',
    },
    {
      name: 'Buy: Tenugui cloth',
      activity_type: 'souvenirs',
      description: 'Traditional thin cotton towels come in regional patterns and pack flat.',
    },
    {
      name: 'Buy: Japanese kitchen knife',
      activity_type: 'souvenirs',
      description: 'Sakai and Seki knives are prized by cooks; buy from a reputable shop and pack checked luggage.',
    },
  ],
  france: [
    {
      name: 'Buy: Savon de Marseille soap',
      activity_type: 'souvenirs',
      description: 'Traditional olive-oil soap from Provence is practical, compact, and easy to bring home.',
    },
    {
      name: 'Try: Regional cheese',
      activity_type: 'dining',
      description: 'Look for local cheese shops and ask what travels best for your route.',
    },
  ],
  italy: [
    {
      name: 'Buy: Extra virgin olive oil',
      activity_type: 'souvenirs',
      description: 'Small tins or well-packed bottles from regional producers make useful food souvenirs.',
    },
    {
      name: 'Buy: Italian leather goods',
      activity_type: 'souvenirs',
      description: 'Florence and other cities are known for leather bags, belts, wallets, and small accessories.',
    },
    {
      name: 'Try: Limoncello',
      activity_type: 'dining',
      description: 'A lemon liqueur associated with southern Italy and the Amalfi Coast.',
    },
  ],
  spain: [
    {
      name: 'Buy: Saffron from La Mancha',
      activity_type: 'souvenirs',
      description: 'Spanish saffron is light, valuable, and easy to pack.',
    },
    {
      name: 'Try: Iberian jamon',
      activity_type: 'dining',
      description: 'Jamon iberico is a Spanish specialty; check import rules before packing meat products.',
    },
  ],
  portugal: [
    {
      name: 'Buy: Port wine',
      activity_type: 'souvenirs',
      description: 'Small bottles from Porto or Vila Nova de Gaia cellars are classic Portugal souvenirs.',
    },
    {
      name: 'Buy: Cork products',
      activity_type: 'souvenirs',
      description: "Portugal produces much of the world's cork; wallets, bags, and hats are common market finds.",
    },
  ],
  greece: [
    {
      name: 'Buy: Greek olive oil',
      activity_type: 'souvenirs',
      description: 'Look for small tins or sealed bottles from Crete, Kalamata, or other regional producers.',
    },
    {
      name: 'Try: Ouzo or mastiha',
      activity_type: 'dining',
      description: 'These signature Greek spirits are common at tavernas and specialty shops.',
    },
  ],
  turkey: [
    {
      name: 'Buy: Turkish delight',
      activity_type: 'souvenirs',
      description: 'Fresh lokum from markets or confectioners is a compact edible souvenir.',
    },
    {
      name: 'Buy: Turkish tea glasses',
      activity_type: 'souvenirs',
      description: 'Tulip-shaped glasses and small tea sets are common in bazaars and home-goods shops.',
    },
  ],
  thailand: [
    {
      name: 'Buy: Thai silk',
      activity_type: 'souvenirs',
      description: 'Silk scarves, ties, and fabric are lightweight and common in markets and boutiques.',
    },
    {
      name: 'Buy: Thai spice set',
      activity_type: 'souvenirs',
      description: 'Dried curry pastes, lemongrass, and spice kits are compact food souvenirs.',
    },
  ],
  vietnam: [
    {
      name: 'Buy: Vietnamese coffee and phin filter',
      activity_type: 'souvenirs',
      description: 'Robusta beans and a metal phin brewer let you make Vietnamese coffee at home.',
    },
    {
      name: 'Buy: Lacquerware',
      activity_type: 'souvenirs',
      description: 'Painted lacquer boxes and bowls are traditional Vietnamese craft items.',
    },
  ],
  india: [
    {
      name: 'Buy: Darjeeling or Assam tea',
      activity_type: 'souvenirs',
      description: 'Premium loose-leaf tea is easy to pack and widely available from specialty shops.',
    },
    {
      name: 'Buy: Spice collection',
      activity_type: 'souvenirs',
      description: 'Cardamom, saffron, turmeric, and garam masala are common food souvenirs.',
    },
  ],
  morocco: [
    {
      name: 'Buy: Argan oil',
      activity_type: 'souvenirs',
      description: 'Pure argan oil from cooperatives is sold in cosmetic and culinary grades.',
    },
    {
      name: 'Buy: Moroccan spices',
      activity_type: 'souvenirs',
      description: 'Ras el hanout, preserved lemons, and saffron are common market finds.',
    },
  ],
  australia: [
    {
      name: 'Try: Tim Tams',
      activity_type: 'dining',
      description: 'An iconic Australian chocolate biscuit, often available in flavors you may not find at home.',
    },
    {
      name: 'Buy: Macadamia products',
      activity_type: 'souvenirs',
      description: 'Roasted macadamias, oils, and chocolates are common Australian food souvenirs.',
    },
  ],
  'new zealand': [
    {
      name: 'Buy: Manuka honey',
      activity_type: 'souvenirs',
      description: 'UMF-rated manuka honey is a signature New Zealand product; check customs limits before packing.',
    },
    {
      name: 'Buy: Merino wool clothing',
      activity_type: 'souvenirs',
      description: 'Lightweight merino layers are practical souvenirs from New Zealand brands.',
    },
  ],
  colombia: [
    {
      name: 'Buy: Colombian coffee beans',
      activity_type: 'souvenirs',
      description: 'Single-origin Colombian beans are a useful food souvenir from cafes or specialty roasters.',
    },
    {
      name: 'Buy: Mochila Wayuu bag',
      activity_type: 'souvenirs',
      description: 'Colorful hand-woven bags made by Wayuu artisans.',
    },
  ],
  mexico: [
    {
      name: 'Try: Oaxacan mezcal',
      activity_type: 'dining',
      description: 'Small-batch mezcal tastings are common in Oaxaca and specialty bars.',
    },
    {
      name: 'Buy: Mexican vanilla extract',
      activity_type: 'souvenirs',
      description: 'Pure vanilla from Veracruz is compact and useful for cooking.',
    },
  ],
  peru: [
    {
      name: 'Buy: Alpaca wool textiles',
      activity_type: 'souvenirs',
      description: 'Scarves, sweaters, and blankets made from alpaca wool are common in Peru.',
    },
    {
      name: 'Try: Pisco',
      activity_type: 'dining',
      description: "Peru's national spirit is often served in pisco sours and tastings.",
    },
  ],
};

function suggestionToActivity(suggestion: LocalSuggestion): ActivitySuggestion {
  return {
    activity_name: suggestion.name,
    activity_type: suggestion.activity_type,
    description: suggestion.description,
    source: 'local_guide',
    external_id: null,
    photo_url: null,
  };
}

function normalizeDestination(destination: string): string {
  return destination.trim().toLowerCase();
}

export function localActivitySuggestionsForDestination(destination: string): ActivitySuggestion[] {
  const normalizedDestination = normalizeDestination(destination);
  const suggestions: ActivitySuggestion[] = [];
  const seen = new Set<string>();

  for (const [keyword, keywordSuggestions] of Object.entries(LOCAL_SUGGESTIONS)) {
    if (!normalizedDestination.includes(keyword)) continue;

    for (const suggestion of keywordSuggestions) {
      const key = suggestion.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push(suggestionToActivity(suggestion));
    }
  }

  if (suggestions.length > 0) return suggestions;

  return [{
    activity_name: 'Browse local markets for souvenirs',
    activity_type: 'souvenirs',
    description: `Find local crafts, foods, and small gifts typical of ${destination}.`,
    source: 'local_guide',
    external_id: null,
    photo_url: null,
  }];
}

export function appendLocalActivitySuggestions(
  activities: ActivitySuggestion[],
  destination: string,
): ActivitySuggestion[] {
  const existingNames = new Set(activities.map((activity) => activity.activity_name.toLowerCase()));
  const localSuggestions = localActivitySuggestionsForDestination(destination).filter((suggestion) => (
    !existingNames.has(suggestion.activity_name.toLowerCase())
  ));

  return [...activities, ...localSuggestions];
}
