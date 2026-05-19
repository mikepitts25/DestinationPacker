export type SubscriptionTier = 'free' | 'premium';

export type AccommodationType =
  | 'hotel'
  | 'hostel'
  | 'airbnb'
  | 'camping'
  | 'resort'
  | 'cruise'
  | 'friends_family';

export type TravelMethod = 'flight' | 'road_trip' | 'train' | 'cruise' | 'backpacking';

export interface TripLeg {
  destination: string;
  travel_method: TravelMethod;
  accommodation: AccommodationType;
  start_date: string;
  end_date: string;
  latitude?: number | null;
  longitude?: number | null;
  country_code?: string | null;
}

export type ActivityType =
  | 'outdoor'
  | 'water'
  | 'cultural'
  | 'nightlife'
  | 'dining'
  | 'sports'
  | 'beach'
  | 'snow'
  | 'business'
  | 'wellness'
  | 'shopping'
  | 'souvenirs'
  | 'family'
  | 'adventure';

export type ActivityInterest =
  | 'hiking'
  | 'cycling'
  | 'surfing'
  | 'skiing_snowboarding'
  | 'scuba_diving'
  | 'rock_climbing'
  | 'museums'
  | 'art_galleries'
  | 'historical_sites'
  | 'architecture'
  | 'local_markets'
  | 'fine_dining'
  | 'street_food'
  | 'wine_tasting'
  | 'craft_beer'
  | 'nightclubs'
  | 'live_music'
  | 'spa_wellness'
  | 'beach_pool'
  | 'yoga_retreats'
  | 'theme_parks'
  | 'zoos_aquariums'
  | 'kid_friendly'
  | 'extreme_sports'
  | 'safari'
  | 'backpacking';

export type ItemSource = 'rule_engine' | 'ai' | 'activity' | 'user_added';
export type TravelerType = 'male' | 'female' | 'child' | 'pet' | 'shared';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  subscription: SubscriptionTier;
  preferences: Record<string, unknown>;
  created_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  destination: string;
  latitude: number | null;
  longitude: number | null;
  country_code: string | null;
  start_date: string;
  end_date: string;
  accommodation: AccommodationType;
  travel_method: TravelMethod;
  travelers: number;
  male_travelers: number;
  female_travelers: number;
  children: number;
  pets: number;
  activity_interests: ActivityInterest[];
  notes: string | null;
  has_laundry_access: boolean;
  legs: TripLeg[];
  duration_days: number;
  created_at: string;
}

export interface PackingItem {
  id: string;
  trip_id: string;
  activity_id: string | null;
  category: string;
  item_name: string;
  quantity: number;
  packed: boolean;
  essential: boolean;
  source: ItemSource;
  traveler_type: TravelerType;
}

export interface PackingList {
  trip_id: string;
  items: PackingItem[];
  categories: string[];
  total_items: number;
  packed_items: number;
}

export interface Activity {
  id: string;
  trip_id: string;
  activity_name: string;
  activity_type: ActivityType;
  description: string | null;
  source: string;
  external_id: string | null;
  photo_url: string | null;
  rating: number | null;
  review_count: number | null;
  rating_source: string | null;
  distance_from_center_km: number | null;
  selected: boolean;
}

export interface WeatherDay {
  date: string;
  temp_min: number;
  temp_max: number;
  avg_temp: number;
  description: string;
  has_rain: boolean;
  has_snow: boolean;
  rain_probability: number | null;
  icon: string;
}

export interface WeatherForecastSource {
  name: string;
  url: string;
}

export interface WeatherForecast {
  destination: string;
  days: WeatherDay[];
  conditions: string[];
  summary: string;
  source: WeatherForecastSource;
  updated_at: string;
}

export interface TripCreate {
  destination: string;
  latitude?: number;
  longitude?: number;
  country_code?: string;
  start_date: string;
  end_date: string;
  accommodation: AccommodationType;
  travel_method: TravelMethod;
  travelers: number;
  male_travelers?: number;
  female_travelers?: number;
  children?: number;
  pets?: number;
  activity_interests?: ActivityInterest[];
  has_laundry_access?: boolean;
  legs?: TripLeg[];
  notes?: string;
}
