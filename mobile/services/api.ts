import * as Linking from 'expo-linking';
import { FREE_TRIP_LIMIT } from '@/constants/config';
import { supabase } from '@/lib/supabase';
import {
  classifyWeather,
  generateActivityPackingItems,
  generatePackingList,
  type PackingRecommendation,
} from '@/lib/packing/ruleEngine';
import type {
  Activity,
  ActivityType,
  ItemSource,
  PackingItem,
  PackingList,
  Trip,
  TripCreate,
  User,
  WeatherDay,
  WeatherForecast,
} from '@/types';

export function setAuthToken(_token: string | null) {
  // Supabase manages session persistence internally. This remains for older call sites.
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isPaymentRequired() {
    return this.status === 402;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

function mapProfile(row: any): User {
  return {
    id: row.id,
    email: row.email ?? '',
    display_name: row.display_name ?? null,
    subscription: row.subscription ?? 'free',
    preferences: row.preferences ?? {},
    created_at: row.created_at,
  };
}

function durationDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  return Number.isFinite(days) ? Math.max(1, days) : 1;
}

function mapTrip(row: any): Trip {
  return {
    id: row.id,
    user_id: row.user_id,
    destination: row.destination,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    country_code: row.country_code ?? null,
    start_date: row.start_date,
    end_date: row.end_date,
    accommodation: row.accommodation,
    travel_method: row.travel_method,
    travelers: row.travelers,
    notes: row.notes ?? null,
    duration_days: durationDays(row.start_date, row.end_date),
    created_at: row.created_at,
  };
}

function mapPackingItem(row: any): PackingItem {
  return {
    id: row.id,
    trip_id: row.trip_id,
    activity_id: row.activity_id ?? null,
    category: row.category,
    item_name: row.item_name,
    quantity: row.quantity,
    packed: row.packed,
    essential: row.essential,
    source: row.source,
  };
}

function mapActivity(row: any): Activity {
  return {
    id: row.id,
    trip_id: row.trip_id,
    activity_name: row.activity_name,
    activity_type: row.activity_type,
    description: row.description ?? null,
    source: row.source,
    external_id: row.external_id ?? null,
    photo_url: row.photo_url ?? null,
    selected: row.selected,
  };
}

function toPackingList(tripId: string, rows: any[]): PackingList {
  const items = rows.map(mapPackingItem);
  const categories = Array.from(new Set(items.map((item) => item.category)));

  return {
    trip_id: tripId,
    items,
    categories,
    total_items: items.length,
    packed_items: items.filter((item) => item.packed).length,
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new ApiError(error?.message ?? 'Not authenticated', 401);
  }
  return data.user.id;
}

async function getOrCreateProfile(authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,display_name,subscription,preferences,created_at')
    .eq('id', authUser.id)
    .single();

  if (!error && data) return mapProfile(data);

  const displayName =
    typeof authUser.user_metadata?.display_name === 'string'
      ? authUser.user_metadata.display_name
      : typeof authUser.user_metadata?.full_name === 'string'
        ? authUser.user_metadata.full_name
        : null;

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .upsert({
      id: authUser.id,
      email: authUser.email ?? null,
      display_name: displayName,
    })
    .select('id,email,display_name,subscription,preferences,created_at')
    .single();

  if (insertError) throw new ApiError(insertError.message, 500);
  return mapProfile(inserted);
}

function normalizePackingRecommendations(items: unknown): PackingRecommendation[] {
  if (!Array.isArray(items)) return [];

  return items.flatMap((item: any) => {
    if (!item || typeof item.item_name !== 'string' || typeof item.category !== 'string') {
      return [];
    }

    return [{
      category: item.category,
      item_name: item.item_name,
      quantity: Math.max(1, Number(item.quantity) || 1),
      essential: Boolean(item.essential),
      source: 'ai' as ItemSource,
      activity_type: null,
    }];
  });
}

function mergeRecommendations(items: PackingRecommendation[]): PackingRecommendation[] {
  const merged = new Map<string, PackingRecommendation>();

  for (const item of items) {
    const key = item.item_name.trim().toLowerCase();
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      continue;
    }

    merged.set(key, {
      ...existing,
      quantity: Math.max(existing.quantity, item.quantity),
      essential: existing.essential || item.essential,
      source: existing.source === 'rule_engine' ? item.source : existing.source,
    });
  }

  return Array.from(merged.values());
}

// Auth

export const usersApi = {
  register: async (data: { email: string; password: string; display_name?: string }) => {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { display_name: data.display_name ?? null },
      },
    });

    if (error) throw new ApiError(error.message, error.status ?? 400);
    if (!authData.session || !authData.user) {
      throw new ApiError('Check your email to confirm your account, then sign in.', 202);
    }

    const user = await getOrCreateProfile(authData.user);
    return {
      access_token: authData.session.access_token,
      token_type: 'bearer',
      user,
    } satisfies TokenResponse;
  },

  login: async (data: { email: string; password: string }) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw new ApiError(error.message, error.status ?? 400);
    if (!authData.session || !authData.user) {
      throw new ApiError('Unable to start a Supabase session.', 401);
    }

    const user = await getOrCreateProfile(authData.user);
    return {
      access_token: authData.session.access_token,
      token_type: 'bearer',
      user,
    } satisfies TokenResponse;
  },

  me: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new ApiError(error?.message ?? 'Not authenticated', 401);
    }

    return getOrCreateProfile(data.user);
  },

  updateMe: async (data: { display_name?: string; preferences?: Record<string, unknown> }) => {
    const userId = await requireUserId();
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId)
      .select('id,email,display_name,subscription,preferences,created_at')
      .single();

    if (error) throw new ApiError(error.message, 400);
    return mapProfile(updated);
  },

  requestPasswordReset: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL('/reset-password'),
    });
    if (error) throw new ApiError(error.message, error.status ?? 400);
  },

  confirmPasswordReset: async (_email: string, _code: string, new_password: string) => {
    const { data, error } = await supabase.auth.updateUser({ password: new_password });
    if (error) throw new ApiError(error.message, error.status ?? 400);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session || !data.user) {
      throw new ApiError('Password was updated, but no active session is available.', 401);
    }

    const user = await getOrCreateProfile(data.user);
    return {
      access_token: sessionData.session.access_token,
      token_type: 'bearer',
      user,
    } satisfies TokenResponse;
  },
};

// Trips

export const tripsApi = {
  list: async () => {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) throw new ApiError(error.message, 400);
    return (data ?? []).map(mapTrip);
  },

  create: async (data: TripCreate) => {
    const user = await usersApi.me();
    if (user.subscription !== 'premium') {
      const { count, error: countError } = await supabase
        .from('trips')
        .select('id', { count: 'exact', head: true });

      if (countError) throw new ApiError(countError.message, 400);
      if ((count ?? 0) >= FREE_TRIP_LIMIT) {
        throw new ApiError('Free users can save up to 3 trips. Upgrade to Premium for unlimited trips.', 402);
      }
    }

    const { data: inserted, error } = await supabase
      .from('trips')
      .insert({ ...data, user_id: user.id })
      .select('*')
      .single();

    if (error) throw new ApiError(error.message, 400);
    return mapTrip(inserted);
  },

  get: async (tripId: string) => {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (error) throw new ApiError(error.message, 404);
    return mapTrip(data);
  },

  update: async (tripId: string, data: Partial<TripCreate>) => {
    const { data: updated, error } = await supabase
      .from('trips')
      .update(data)
      .eq('id', tripId)
      .select('*')
      .single();

    if (error) throw new ApiError(error.message, 400);
    return mapTrip(updated);
  },

  delete: async (tripId: string) => {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);

    if (error) throw new ApiError(error.message, 400);
  },
};

// Packing

export const packingApi = {
  getList: async (tripId: string) => {
    const { data, error } = await supabase
      .from('packing_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('category', { ascending: true })
      .order('essential', { ascending: false })
      .order('item_name', { ascending: true });

    if (error) throw new ApiError(error.message, 400);
    return toPackingList(tripId, data ?? []);
  },

  generate: async (tripId: string) => {
    const [trip, user] = await Promise.all([tripsApi.get(tripId), usersApi.me()]);
    const { data: selectedActivities, error: activitiesError } = await supabase
      .from('trip_activities')
      .select('id,activity_type,activity_name,description')
      .eq('trip_id', tripId)
      .eq('selected', true);

    if (activitiesError) throw new ApiError(activitiesError.message, 400);

    let weather: WeatherForecast | null = null;
    if (trip.latitude !== null && trip.longitude !== null) {
      try {
        weather = await weatherApi.getForecast(
          trip.latitude,
          trip.longitude,
          trip.destination,
          trip.start_date,
          trip.end_date,
        );
      } catch {
        weather = null;
      }
    }

    const selectedActivityTypes = Array.from(new Set((selectedActivities ?? []).map((activity: any) => activity.activity_type)));
    const activityIdByType = new Map<string, string>();
    for (const activity of selectedActivities ?? []) {
      if (!activityIdByType.has(activity.activity_type)) {
        activityIdByType.set(activity.activity_type, activity.id);
      }
    }
    const ruleItems = generatePackingList(trip, weather?.conditions ?? [], selectedActivityTypes);
    let allItems = ruleItems;

    if (user.subscription === 'premium') {
      try {
        const { data, error } = await supabase.functions.invoke('ai-packing', {
          body: {
            trip,
            weather_summary: weather?.summary ?? 'Weather unavailable.',
            weather_conditions: weather?.conditions ?? [],
            selected_activities: selectedActivities ?? [],
          },
        });

        if (!error) {
          allItems = mergeRecommendations([...ruleItems, ...normalizePackingRecommendations(data?.items ?? data)]);
        }
      } catch {
        allItems = ruleItems;
      }
    }

    const { error: deleteError } = await supabase
      .from('packing_items')
      .delete()
      .eq('trip_id', tripId)
      .in('source', ['rule_engine', 'activity', 'ai']);

    if (deleteError) throw new ApiError(deleteError.message, 400);

    if (allItems.length > 0) {
      const { error: insertError } = await supabase
        .from('packing_items')
        .insert(allItems.map((item) => ({
          trip_id: tripId,
          activity_id: item.source === 'activity' && item.activity_type
            ? activityIdByType.get(item.activity_type) ?? null
            : null,
          category: item.category,
          item_name: item.item_name,
          quantity: item.quantity,
          essential: item.essential,
          source: item.source,
        })));

      if (insertError) throw new ApiError(insertError.message, 400);
    }

    return packingApi.getList(tripId);
  },

  addItem: async (tripId: string, data: { category: string; item_name: string; quantity: number; essential: boolean }) => {
    const { data: inserted, error } = await supabase
      .from('packing_items')
      .insert({
        ...data,
        trip_id: tripId,
        quantity: Math.max(1, data.quantity || 1),
        source: 'user_added',
      })
      .select('*')
      .single();

    if (error) throw new ApiError(error.message, 400);
    return mapPackingItem(inserted);
  },

  updateItem: async (tripId: string, itemId: string, data: { packed?: boolean; quantity?: number; item_name?: string; category?: string }) => {
    const { data: updated, error } = await supabase
      .from('packing_items')
      .update(data)
      .eq('trip_id', tripId)
      .eq('id', itemId)
      .select('*')
      .single();

    if (error) throw new ApiError(error.message, 400);
    return mapPackingItem(updated);
  },

  deleteItem: async (tripId: string, itemId: string) => {
    const { error } = await supabase
      .from('packing_items')
      .delete()
      .eq('trip_id', tripId)
      .eq('id', itemId);

    if (error) throw new ApiError(error.message, 400);
  },
};

// Activities

function fallbackActivities(destination: string): Omit<Activity, 'id' | 'trip_id' | 'selected'>[] {
  return [
    {
      activity_name: `Explore ${destination} city center`,
      activity_type: 'cultural',
      description: 'Walk around and discover local neighborhoods.',
      source: 'suggested',
      external_id: null,
      photo_url: null,
    },
    {
      activity_name: 'Visit local museums',
      activity_type: 'cultural',
      description: 'Explore history, art, and culture.',
      source: 'suggested',
      external_id: null,
      photo_url: null,
    },
    {
      activity_name: 'Try local cuisine',
      activity_type: 'dining',
      description: 'Sample authentic local food and restaurants.',
      source: 'suggested',
      external_id: null,
      photo_url: null,
    },
    {
      activity_name: 'Day hike or nature walk',
      activity_type: 'outdoor',
      description: 'Discover the natural surroundings.',
      source: 'suggested',
      external_id: null,
      photo_url: null,
    },
  ];
}

function normalizeActivities(items: unknown, destination: string): Omit<Activity, 'id' | 'trip_id' | 'selected'>[] {
  if (!Array.isArray(items)) return fallbackActivities(destination);

  const normalized = items.flatMap((item: any) => {
    if (!item || typeof item.activity_name !== 'string') return [];
    return [{
      activity_name: item.activity_name,
      activity_type: (item.activity_type ?? 'cultural') as ActivityType,
      description: typeof item.description === 'string' ? item.description : null,
      source: typeof item.source === 'string' ? item.source : 'openstreetmap',
      external_id: typeof item.external_id === 'string' ? item.external_id : null,
      photo_url: typeof item.photo_url === 'string' ? item.photo_url : null,
    }];
  });

  return normalized.length > 0 ? normalized : fallbackActivities(destination);
}

export const activitiesApi = {
  list: async (tripId: string) => {
    const { data, error } = await supabase
      .from('trip_activities')
      .select('*')
      .eq('trip_id', tripId)
      .order('selected', { ascending: false })
      .order('activity_name', { ascending: true });

    if (error) throw new ApiError(error.message, 400);
    return (data ?? []).map(mapActivity);
  },

  fetch: async (tripId: string) => {
    const trip = await tripsApi.get(tripId);
    let activities = fallbackActivities(trip.destination);

    if (trip.latitude !== null && trip.longitude !== null) {
      try {
        const { data, error } = await supabase.functions.invoke('activities-search', {
          body: {
            destination: trip.destination,
            lat: trip.latitude,
            lon: trip.longitude,
          },
        });

        if (!error) {
          activities = normalizeActivities(data?.activities ?? data, trip.destination);
        }
      } catch {
        activities = fallbackActivities(trip.destination);
      }
    }

    const existing = await activitiesApi.list(tripId);
    const existingKeys = new Set(existing.map((activity) => (
      activity.external_id ? `id:${activity.external_id}` : `name:${activity.activity_name.toLowerCase()}`
    )));

    const rows = activities
      .filter((activity) => {
        const key = activity.external_id ? `id:${activity.external_id}` : `name:${activity.activity_name.toLowerCase()}`;
        return !existingKeys.has(key);
      })
      .map((activity) => ({ ...activity, trip_id: tripId, selected: false }));

    if (rows.length > 0) {
      const { error } = await supabase.from('trip_activities').insert(rows);
      if (error) throw new ApiError(error.message, 400);
    }

    return activitiesApi.list(tripId);
  },

  toggle: async (tripId: string, activityId: string, selected: boolean) => {
    const { data: updated, error } = await supabase
      .from('trip_activities')
      .update({ selected })
      .eq('trip_id', tripId)
      .eq('id', activityId)
      .select('*')
      .single();

    if (error) throw new ApiError(error.message, 400);

    if (!selected) {
      const { error: deleteError } = await supabase
        .from('packing_items')
        .delete()
        .eq('trip_id', tripId)
        .eq('activity_id', activityId);

      if (deleteError) throw new ApiError(deleteError.message, 400);
    } else {
      const additions = generateActivityPackingItems(updated.activity_type);
      if (additions.length > 0) {
        const { data: existingRows, error: existingError } = await supabase
          .from('packing_items')
          .select('item_name')
          .eq('trip_id', tripId)
          .eq('activity_id', activityId);

        if (existingError) throw new ApiError(existingError.message, 400);
        const existingNames = new Set((existingRows ?? []).map((item: any) => item.item_name.toLowerCase()));
        const rows = additions
          .filter((item) => !existingNames.has(item.item_name.toLowerCase()))
          .map((item) => ({
            trip_id: tripId,
            activity_id: activityId,
            category: item.category,
            item_name: item.item_name,
            quantity: item.quantity,
            essential: item.essential,
            source: 'activity',
          }));

        if (rows.length > 0) {
          const { error: insertError } = await supabase.from('packing_items').insert(rows);
          if (insertError) throw new ApiError(insertError.message, 400);
        }
      }
    }

    return mapActivity(updated);
  },

  addCustom: async (tripId: string, data: { activity_name: string; activity_type: string; description?: string }) => {
    const { data: inserted, error } = await supabase
      .from('trip_activities')
      .insert({
        trip_id: tripId,
        activity_name: data.activity_name,
        activity_type: data.activity_type,
        description: data.description ?? null,
        source: 'user_added',
        selected: true,
      })
      .select('*')
      .single();

    if (error) throw new ApiError(error.message, 400);
    return mapActivity(inserted);
  },
};

// Weather and places

const WMO_DESCRIPTIONS: Record<number, [string, boolean, boolean]> = {
  0: ['Clear sky', false, false],
  1: ['Mainly clear', false, false],
  2: ['Partly cloudy', false, false],
  3: ['Overcast', false, false],
  45: ['Foggy', false, false],
  48: ['Freezing fog', false, false],
  51: ['Light drizzle', true, false],
  53: ['Moderate drizzle', true, false],
  55: ['Dense drizzle', true, false],
  56: ['Freezing drizzle', true, false],
  57: ['Heavy freezing drizzle', true, false],
  61: ['Slight rain', true, false],
  63: ['Moderate rain', true, false],
  65: ['Heavy rain', true, false],
  66: ['Freezing rain', true, false],
  67: ['Heavy freezing rain', true, false],
  71: ['Slight snow', false, true],
  73: ['Moderate snow', false, true],
  75: ['Heavy snow', false, true],
  77: ['Snow grains', false, true],
  80: ['Slight rain showers', true, false],
  81: ['Moderate rain showers', true, false],
  82: ['Violent rain showers', true, false],
  85: ['Slight snow showers', false, true],
  86: ['Heavy snow showers', false, true],
  95: ['Thunderstorm', true, false],
  96: ['Thunderstorm with hail', true, false],
  99: ['Thunderstorm with heavy hail', true, false],
};

function daysUntil(date: string): number {
  const today = new Date();
  const start = new Date(`${date}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  return Math.floor((start.getTime() - today.getTime()) / 86400000);
}

function parseForecast(destination: string, data: any): WeatherForecast {
  const daily = data?.daily ?? {};
  const dates = daily.time ?? [];
  const tempMaxes = daily.temperature_2m_max ?? [];
  const tempMins = daily.temperature_2m_min ?? [];
  const weatherCodes = daily.weathercode ?? daily.weather_code ?? [];
  const days: WeatherDay[] = [];

  for (let i = 0; i < Math.min(16, dates.length); i += 1) {
    const temp_min = Number(tempMins[i]);
    const temp_max = Number(tempMaxes[i]);
    const avg_temp = (temp_min + temp_max) / 2;
    const [description, has_rain, has_snow] = WMO_DESCRIPTIONS[Number(weatherCodes[i])] ?? ['Unknown', false, false];

    days.push({
      date: dates[i],
      temp_min: Math.round(temp_min * 10) / 10,
      temp_max: Math.round(temp_max * 10) / 10,
      avg_temp: Math.round(avg_temp * 10) / 10,
      description,
      has_rain,
      has_snow,
      icon: has_snow ? 'snow' : has_rain ? 'rain' : avg_temp > 27 ? 'sunny' : 'cloudy',
    });
  }

  const avgTemp = days.length > 0
    ? days.reduce((sum, day) => sum + day.avg_temp, 0) / days.length
    : 20;
  const conditions = classifyWeather(
    avgTemp,
    days.some((day) => day.has_rain),
    days.some((day) => day.has_snow),
  );
  const tempRange = days.length > 0
    ? `${Math.min(...days.map((day) => day.temp_min)).toFixed(0)}-${Math.max(...days.map((day) => day.temp_max)).toFixed(0)}C`
    : 'unknown';
  const rain = days.some((day) => day.has_rain) ? ' with rain expected' : '';
  const snow = days.some((day) => day.has_snow) ? ' with snow expected' : '';

  return {
    destination,
    days,
    conditions,
    summary: `Temperatures ${tempRange}${rain}${snow}.`,
  };
}

export const weatherApi = {
  getForecast: async (
    lat: number,
    lon: number,
    destination: string,
    startDate?: string,
    _endDate?: string,
  ): Promise<WeatherForecast> => {
    if (startDate && daysUntil(startDate) > 16) {
      return {
        destination,
        days: [],
        conditions: [],
        summary: 'Weather forecast is not available yet for these trip dates. Check back within about two weeks of departure for accurate Open-Meteo data.',
      };
    }

    const forecastDays = startDate ? Math.min(16, Math.max(1, daysUntil(startDate) + 7)) : 7;
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', String(forecastDays));

    const res = await fetch(url.toString());
    if (!res.ok) throw new ApiError(`Weather unavailable (${res.status})`, res.status);
    return parseForecast(destination, await res.json());
  },

  autocomplete: async (query: string) => {
    const { data, error } = await supabase.functions.invoke('places-search', {
      body: { type: 'autocomplete', query },
    });

    if (error) return [] as { place_id: string; description: string }[];
    return Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
  },

  placeDetails: async (placeId: string) => {
    const { data, error } = await supabase.functions.invoke('places-search', {
      body: { type: 'details', place_id: placeId },
    });

    if (error || !data) throw new ApiError(error?.message ?? 'Place details unavailable', 400);
    return data as { name: string; lat: number; lon: number; country_code: string };
  },
};
