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
  | 'shopping';

export type ItemSource = 'rule_engine' | 'ai' | 'activity' | 'user_added';

export interface User {
  id: string;
  firebase_uid: string;
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
  notes: string | null;
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
  icon: string;
}

export interface WeatherForecast {
  destination: string;
  days: WeatherDay[];
  conditions: string[];
  summary: string;
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
  notes?: string;
}
