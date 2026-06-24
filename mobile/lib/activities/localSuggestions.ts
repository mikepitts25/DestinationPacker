import type { Activity, ActivityType } from '@/types';

export type ActivitySuggestion =
  Omit<Activity, 'id' | 'trip_id' | 'destination' | 'selected' | 'rating' | 'review_count' | 'rating_source' | 'distance_from_center_km'>
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
  source?: string;
  external_id?: string;
};

const LOCAL_SUGGESTIONS: Record<string, LocalSuggestion[]> = {
  lisbon: [
    {
      name: 'Time Out Market Lisboa',
      activity_type: 'dining',
      description: 'Food market inside Mercado da Ribeira with many Lisbon food counters, bars, and shops; good after a flight because it stays flexible.',
      external_id: 'local:lisbon:time-out-market-lisboa',
    },
    {
      name: 'Garrafeira Alfaia',
      activity_type: 'dining',
      description: 'Portuguese wine bar and shop for wine, cheese, and small plates; fits a wine-focused evening without a generic restaurant search.',
      external_id: 'local:lisbon:garrafeira-alfaia',
    },
    {
      name: 'Dois Corvos Marvila Taproom',
      activity_type: 'dining',
      description: 'Lisbon craft beer taproom from Dois Corvos; useful for travelers who asked for beer and want a named local stop.',
      external_id: 'local:lisbon:dois-corvos-marvila-taproom',
    },
    {
      name: 'Praia de Carcavelos',
      activity_type: 'beach',
      description: 'Popular Lisbon-coast beach reached by train from Cais do Sodre; pack swimwear, sunscreen, sandals, and a light towel.',
      external_id: 'local:lisbon:praia-de-carcavelos',
    },
    {
      name: 'LX Market at LX Factory',
      activity_type: 'shopping',
      description: 'Market at LX Factory for browsing local vendors, snacks, and small gifts; check the Sunday schedule and bring a reusable bag.',
      external_id: 'local:lisbon:lx-market-lx-factory',
    },
    {
      name: 'Park and National Palace of Pena',
      activity_type: 'outdoor',
      description: 'Sintra park and palace with steep walking routes and viewpoints; book timed entry and pack walking shoes and water.',
      external_id: 'local:lisbon:park-national-palace-pena',
    },
    {
      name: 'Mercado de Campo de Ourique',
      activity_type: 'dining',
      description: 'Neighborhood market and food hall with prepared food, wine, cocktails, and traditional market stalls.',
      external_id: 'local:lisbon:mercado-de-campo-de-ourique',
    },
  ],
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
  belgium: [
    {
      name: 'Experience: Belgian chocolate workshop',
      activity_type: 'dining',
      description: 'Book a hands-on chocolate class where you make pralines or truffles with a local chocolatier.',
    },
    {
      name: 'Buy: Belgian chocolate',
      activity_type: 'souvenirs',
      description: 'Pralines, truffles, and bean-to-bar chocolate are classic Belgian gifts; buy from a chocolatier rather than a tourist rack.',
    },
    {
      name: 'Try: Belgian beer tasting',
      activity_type: 'dining',
      description: 'Belgium has a deep beer culture, from lambics to Trappist ales; a guided tasting helps decode the styles.',
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

const EXPERIENCE_SUGGESTIONS: Record<string, LocalSuggestion[]> = {
  italy: [
    {
      name: 'Experience: Fresh pasta cooking class',
      activity_type: 'dining',
      description: 'Learn to make pasta, sauce, or regional dishes with a local cook; it is more memorable than another restaurant reservation.',
    },
    {
      name: 'Experience: Historic piazza and church walk',
      activity_type: 'cultural',
      description: 'Build a route around old churches, civic buildings, fountains, and piazzas instead of only the headline museum.',
    },
  ],
  thailand: [
    {
      name: 'Experience: Thai cooking class with market visit',
      activity_type: 'dining',
      description: 'Choose a class that starts in a fresh market so you learn ingredients before cooking curries, soups, or stir-fries.',
    },
    {
      name: 'Experience: Temple and old town walk',
      activity_type: 'cultural',
      description: 'Plan a respectful route through historic temples, old neighborhoods, and small shrine stops.',
    },
  ],
  france: [
    {
      name: 'Experience: Regional wine tasting',
      activity_type: 'dining',
      description: 'Book a tasting focused on the region you are visiting, from Bordeaux and Burgundy to Alsace or the Loire.',
    },
    {
      name: 'Experience: Market cooking class',
      activity_type: 'dining',
      description: 'A market-to-table class turns local produce, cheese, bread, and wine into a practical food experience.',
    },
    {
      name: 'Experience: Chateaux, cathedrals, or old quarter route',
      activity_type: 'cultural',
      description: 'Leave space for historic buildings, castles, cathedrals, and preserved streets outside the biggest museum stops.',
    },
  ],
  japan: [
    {
      name: 'Experience: Tea ceremony or wagashi class',
      activity_type: 'cultural',
      description: 'A guided tea ceremony or sweets workshop gives context to etiquette, craft, and seasonal flavors.',
    },
    {
      name: 'Experience: Shrine, temple, and garden route',
      activity_type: 'cultural',
      description: 'Pair historic temples or shrines with a garden visit for a slower cultural day.',
    },
  ],
  spain: [
    {
      name: 'Experience: Tapas or market food tour',
      activity_type: 'dining',
      description: 'A guided tapas route helps you try regional dishes without guessing from a crowded menu.',
    },
    {
      name: 'Experience: Moorish, medieval, or old town architecture walk',
      activity_type: 'cultural',
      description: 'Spain rewards slow routes through old quarters, cathedrals, fortresses, and tiled civic buildings.',
    },
  ],
  greece: [
    {
      name: 'Experience: Greek cooking class',
      activity_type: 'dining',
      description: 'Look for a class built around olive oil, herbs, seafood, pastries, or island specialties.',
    },
    {
      name: 'Experience: Ancient ruins and archaeological site visit',
      activity_type: 'cultural',
      description: 'Prioritize ancient sites, old fortifications, and small archaeological museums near your route.',
    },
  ],
  portugal: [
    {
      name: 'Experience: Port or vinho verde tasting',
      activity_type: 'dining',
      description: 'Use a tasting to compare regional wines and learn what is realistic to bring home.',
    },
    {
      name: 'Experience: Azulejo and old town architecture walk',
      activity_type: 'cultural',
      description: 'Look for tiled facades, monasteries, viewpoints, and old streets instead of only shopping streets.',
    },
  ],
  mexico: [
    {
      name: 'Experience: Mole, tortilla, or mezcal class',
      activity_type: 'dining',
      description: 'A hands-on food or mezcal session gives better context than a generic restaurant stop.',
    },
    {
      name: 'Experience: Archaeological ruins or colonial center visit',
      activity_type: 'cultural',
      description: 'Plan time for ruins, old churches, plazas, and regional museums when they fit your route.',
    },
  ],
  morocco: [
    {
      name: 'Experience: Tagine or pastry cooking class',
      activity_type: 'dining',
      description: 'A class focused on spices, bread, tagine, or pastries makes the souk ingredients easier to understand.',
    },
    {
      name: 'Experience: Medina craft walk',
      activity_type: 'shopping',
      description: 'Browse workshops for leather, metalwork, rugs, ceramics, or spices with time to compare quality.',
    },
  ],
  peru: [
    {
      name: 'Experience: Ceviche or pisco sour class',
      activity_type: 'dining',
      description: 'A class or tasting gives you the technique and local context behind Peru staples.',
    },
    {
      name: 'Experience: Archaeological site and colonial architecture route',
      activity_type: 'cultural',
      description: 'Balance museums with ruins, old churches, plazas, and carved stone streets where available.',
    },
  ],
};

const COUNTRY_EXPERIENCE_KEYWORDS = new Set([
  'italy',
  'thailand',
  'france',
  'japan',
  'spain',
  'greece',
  'portugal',
  'mexico',
  'morocco',
  'peru',
]);

function suggestionToActivity(suggestion: LocalSuggestion): ActivitySuggestion {
  return {
    activity_name: suggestion.name,
    activity_type: suggestion.activity_type,
    description: suggestion.description,
    source: suggestion.source ?? 'local_guide',
    external_id: suggestion.external_id ?? null,
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
  const hasSpecificLocalMatch = Object.keys(LOCAL_SUGGESTIONS).some((keyword) => (
    normalizedDestination.includes(keyword) && !COUNTRY_EXPERIENCE_KEYWORDS.has(keyword)
  ));

  const sources = [
    ...Object.entries(LOCAL_SUGGESTIONS).map(([keyword, values]) => ({ keyword, values, kind: 'local' as const })),
    ...Object.entries(EXPERIENCE_SUGGESTIONS).map(([keyword, values]) => ({ keyword, values, kind: 'experience' as const })),
  ];

  for (const { keyword, values: keywordSuggestions, kind } of sources) {
    if (!normalizedDestination.includes(keyword)) continue;
    if (kind === 'experience' && hasSpecificLocalMatch && COUNTRY_EXPERIENCE_KEYWORDS.has(keyword)) continue;

    for (const suggestion of keywordSuggestions) {
      const key = suggestion.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push(suggestionToActivity(suggestion));
    }
  }

  return suggestions;
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
