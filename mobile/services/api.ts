import * as Linking from 'expo-linking';
import { FREE_TRIP_LIMIT } from '@/constants/config';
import { supabase } from '@/lib/supabase';
import {
  generateActivityPackingItems,
  generatePackingList,
  packingActivityKeysForActivity,
  type PackingRecommendation,
} from '@/lib/packing/ruleEngine';
import type { ActivitySuggestion } from '@/lib/activities/localSuggestions';
import {
  completeActivitySuggestions,
  fallbackActivitiesForDestination,
} from '@/lib/activities/suggestions';
import { tripDestinations, type TripDestination } from '@/lib/trips/destinations';
import {
  daysUntil,
  forecastDaysForTrip,
  parseOpenMeteoForecast,
  unavailableForecast,
} from '@/lib/weather/forecast';
import { describeSupabaseWriteError } from '@/lib/supabase/errors';
import type {
  Activity,
  ActivityInterest,
  ActivityType,
  ItemSource,
  PackingItem,
  PackingList,
  Trip,
  TripCreate,
  TripLeg,
  User,
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

function normalizeTripLegs(row: any): TripLeg[] {
  if (!Array.isArray(row.legs)) return [];

  return row.legs.flatMap((leg: any) => {
    if (!leg || typeof leg.destination !== 'string' || !leg.destination.trim()) return [];
    return [{
      destination: leg.destination,
      travel_method: leg.travel_method ?? row.travel_method,
      accommodation: leg.accommodation ?? row.accommodation,
      start_date: leg.start_date ?? row.start_date,
      end_date: leg.end_date ?? row.end_date,
      latitude: leg.latitude ?? null,
      longitude: leg.longitude ?? null,
      country_code: leg.country_code ?? null,
    } satisfies TripLeg];
  });
}

function mapTrip(row: any): Trip {
  const legs = normalizeTripLegs(row);
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
    male_travelers: row.male_travelers ?? 0,
    female_travelers: row.female_travelers ?? 0,
    children: row.children ?? 0,
    pets: row.pets ?? 0,
    activity_interests: row.activity_interests ?? [],
    notes: row.notes ?? null,
    has_laundry_access: Boolean(row.has_laundry_access),
    legs,
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
    traveler_type: row.traveler_type ?? 'shared',
  };
}

function mapActivity(row: any): Activity {
  return {
    id: row.id,
    trip_id: row.trip_id,
    destination: row.destination ?? null,
    activity_name: row.activity_name,
    activity_type: row.activity_type,
    description: row.description ?? null,
    source: row.source,
    external_id: row.external_id ?? null,
    photo_url: row.photo_url ?? null,
    rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : null,
    review_count: row.review_count !== null && row.review_count !== undefined ? Number(row.review_count) : null,
    rating_source: row.rating_source ?? null,
    distance_from_center_km: row.distance_from_center_km !== null && row.distance_from_center_km !== undefined ? Number(row.distance_from_center_km) : null,
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
      traveler_type: ['male', 'female', 'child', 'pet', 'shared'].includes(item.traveler_type)
        ? item.traveler_type
        : 'shared',
    }];
  });
}

function mergeRecommendations(items: PackingRecommendation[]): PackingRecommendation[] {
  const merged = new Map<string, PackingRecommendation>();

  for (const item of items) {
    const key = `${item.traveler_type}:${item.item_name.trim().toLowerCase()}`;
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
        throw new ApiError('Your second trip requires Premium. Create unlimited trips with Premium.', 402);
      }
    }

    const maleTravelers = Math.max(0, data.male_travelers ?? 0);
    const femaleTravelers = Math.max(0, data.female_travelers ?? 0);
    const children = Math.max(0, data.children ?? 0);
    const pets = Math.max(0, data.pets ?? 0);
    const travelerTotal = Math.max(1, maleTravelers + femaleTravelers + children || data.travelers || 1);
    const legs = data.legs?.length
      ? data.legs
      : [{
        destination: data.destination,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        country_code: data.country_code ?? null,
        start_date: data.start_date,
        end_date: data.end_date,
        accommodation: data.accommodation,
        travel_method: data.travel_method,
      }];

    const { data: inserted, error } = await supabase
      .from('trips')
      .insert({
        ...data,
        user_id: user.id,
        travelers: travelerTotal,
        male_travelers: maleTravelers,
        female_travelers: femaleTravelers,
        children,
        pets,
        activity_interests: data.activity_interests ?? [],
        has_laundry_access: Boolean(data.has_laundry_access),
        legs,
      })
      .select('*')
      .single();

    if (error) throw new ApiError(describeSupabaseWriteError(error.message), 400);
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

    const selectedActivityTypes = Array.from(new Set((selectedActivities ?? []).flatMap((activity: any) => (
      packingActivityKeysForActivity(activity)
    ))));
    const activityIdByType = new Map<string, string>();
    for (const activity of selectedActivities ?? []) {
      for (const activityKey of packingActivityKeysForActivity(activity)) {
        if (!activityIdByType.has(activityKey)) {
          activityIdByType.set(activityKey, activity.id);
        }
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
            user_notes: trip.notes ?? '',
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
          traveler_type: item.traveler_type,
        })));

      if (insertError) throw new ApiError(insertError.message, 400);
    }

    return packingApi.getList(tripId);
  },

  addItem: async (tripId: string, data: { category: string; item_name: string; quantity: number; essential: boolean; traveler_type?: string }) => {
    const { data: inserted, error } = await supabase
      .from('packing_items')
      .insert({
        ...data,
        trip_id: tripId,
        quantity: Math.max(1, Math.min(99, data.quantity || 1)),
        source: 'user_added',
        traveler_type: data.traveler_type ?? 'shared',
      })
      .select('*')
      .single();

    if (error) throw new ApiError(error.message, 400);
    return mapPackingItem(inserted);
  },

  restoreItem: async (
    tripId: string,
    data: {
      activity_id: string | null;
      category: string;
      item_name: string;
      quantity: number;
      packed: boolean;
      essential: boolean;
      source: ItemSource;
      traveler_type: string;
    },
  ) => {
    const { data: inserted, error } = await supabase
      .from('packing_items')
      .insert({
        ...data,
        trip_id: tripId,
        quantity: Math.max(1, Math.min(99, data.quantity || 1)),
        traveler_type: data.traveler_type,
      })
      .select('*')
      .single();

    if (error) throw new ApiError(error.message, 400);
    return mapPackingItem(inserted);
  },

  updateItem: async (tripId: string, itemId: string, data: { packed?: boolean; quantity?: number; item_name?: string; category?: string }) => {
    const { data: updated, error } = await supabase
      .from('packing_items')
      .update({
        ...data,
        quantity: data.quantity === undefined ? undefined : Math.max(1, Math.min(99, data.quantity)),
      })
      .eq('trip_id', tripId)
      .eq('id', itemId)
      .select('*')
      .single();

    if (error) throw new ApiError(error.message, 400);
    return mapPackingItem(updated);
  },

  setItemsPacked: async (tripId: string, itemIds: string[], packed: boolean) => {
    if (itemIds.length === 0) return [];

    const { data, error } = await supabase
      .from('packing_items')
      .update({ packed })
      .eq('trip_id', tripId)
      .in('id', itemIds)
      .select('*');

    if (error) throw new ApiError(error.message, 400);
    return (data ?? []).map(mapPackingItem);
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

function normalizeActivities(items: unknown, destination: string, interests: ActivityInterest[] = []): ActivitySuggestion[] {
  if (!Array.isArray(items)) return fallbackActivitiesForDestination(destination, interests);

  const normalized = items.flatMap((item: any) => {
    if (!item || typeof item.activity_name !== 'string') return [];
    const rating = Number(item.rating);
    const reviewCount = Number(item.review_count);
    return [{
      activity_name: item.activity_name,
      activity_type: (item.activity_type ?? 'cultural') as ActivityType,
      description: typeof item.description === 'string' ? item.description : null,
      source: typeof item.source === 'string' ? item.source : 'openstreetmap',
      external_id: typeof item.external_id === 'string' ? item.external_id : null,
      photo_url: typeof item.photo_url === 'string' ? item.photo_url : null,
      rating: Number.isFinite(rating) ? rating : null,
      review_count: Number.isFinite(reviewCount) && reviewCount >= 0 ? Math.round(reviewCount) : null,
      rating_source: typeof item.rating_source === 'string' ? item.rating_source : null,
      distance_from_center_km: Number.isFinite(Number(item.distance_from_center_km))
        ? Number(item.distance_from_center_km)
        : null,
    }];
  });

  return completeActivitySuggestions(
    normalized.length > 0 ? normalized : fallbackActivitiesForDestination(destination, interests),
    destination,
    interests,
  );
}

function activityStorageKey(activity: Pick<Activity, 'destination' | 'external_id' | 'activity_name'>) {
  const destinationKey = (activity.destination ?? '').trim().toLowerCase();
  const nameKey = activity.activity_name.trim().replace(/\s+/g, ' ').toLowerCase();
  return `${destinationKey}:name:${nameKey}`;
}

function dedupeStoredActivities(activities: Activity[]): Activity[] {
  const seen = new Set<string>();

  return activities.filter((activity) => {
    const key = activityStorageKey(activity);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchActivitiesForDestination(
  destination: TripDestination,
  interests: ActivityInterest[],
): Promise<ActivitySuggestion[]> {
  let activities = fallbackActivitiesForDestination(destination.destination, interests);

  if (destination.latitude !== null && destination.longitude !== null) {
    try {
      const { data, error } = await supabase.functions.invoke('activities-search', {
        body: {
          destination: destination.destination,
          lat: destination.latitude,
          lon: destination.longitude,
          interests,
        },
      });

      if (!error) {
        activities = normalizeActivities(data?.activities ?? data, destination.destination, interests);
      }
    } catch {
      activities = fallbackActivitiesForDestination(destination.destination, interests);
    }
  }

  return completeActivitySuggestions(activities, destination.destination, interests);
}

export const activitiesApi = {
  list: async (tripId: string) => {
    const { data, error } = await supabase
      .from('trip_activities')
      .select('*')
      .eq('trip_id', tripId)
      .order('selected', { ascending: false })
      .order('destination', { ascending: true, nullsFirst: false })
      .order('activity_name', { ascending: true });

    if (error) throw new ApiError(error.message, 400);
    return dedupeStoredActivities((data ?? []).map(mapActivity));
  },

  fetch: async (tripId: string) => {
    const trip = await tripsApi.get(tripId);
    const destinations = tripDestinations(trip, { dedupe: true });
    const destinationActivities = await Promise.all(destinations.map(async (destination) => ({
      destination: destination.destination,
      activities: await fetchActivitiesForDestination(destination, trip.activity_interests),
    })));

    const existing = await activitiesApi.list(tripId);
    const existingKeys = new Set(existing.map(activityStorageKey));
    const nextKeys = new Set<string>();

    const rows = destinationActivities.flatMap(({ destination, activities }) => (
      activities
        .filter((activity) => {
          const key = activityStorageKey({ ...activity, destination });
          if (existingKeys.has(key) || nextKeys.has(key)) return false;
          nextKeys.add(key);
          return true;
        })
        .map((activity) => ({ ...activity, trip_id: tripId, destination, selected: false }))
    ));

    if (rows.length > 0) {
      const { error } = await supabase.from('trip_activities').insert(rows);
      if (error) throw new ApiError(error.message, 400);
    }

    return activitiesApi.list(tripId);
  },

  toggle: async (tripId: string, activityId: string, selected: boolean) => {
    const [trip, activityResult] = await Promise.all([
      tripsApi.get(tripId),
      supabase
        .from('trip_activities')
        .update({ selected })
        .eq('trip_id', tripId)
        .eq('id', activityId)
        .select('*')
        .single(),
    ]);
    const { data: updated, error } = activityResult;

    if (error) throw new ApiError(error.message, 400);

    if (!selected) {
      const { error: deleteError } = await supabase
        .from('packing_items')
        .delete()
        .eq('trip_id', tripId)
        .eq('activity_id', activityId);

      if (deleteError) throw new ApiError(deleteError.message, 400);
    } else {
      const additions = packingActivityKeysForActivity(updated).flatMap((activityKey) => (
        generateActivityPackingItems(activityKey, trip.travelers)
      ));
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
            traveler_type: item.traveler_type,
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

export const weatherApi = {
  getForecast: async (
    lat: number,
    lon: number,
    destination: string,
    startDate?: string,
    endDate?: string,
  ): Promise<WeatherForecast> => {
    if (startDate && daysUntil(startDate) > 16) {
      return unavailableForecast(
        destination,
        'Weather forecast is not available yet for these trip dates. Check back within about two weeks of departure for accurate Open-Meteo data.',
      );
    }

    if (endDate && daysUntil(endDate) < 0) {
      return unavailableForecast(
        destination,
        'Weather forecast is no longer available for these past trip dates.',
      );
    }

    const forecastDays = forecastDaysForTrip(startDate, endDate);
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,precipitation_probability_max');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', String(forecastDays));

    const res = await fetch(url.toString());
    if (!res.ok) throw new ApiError(`Weather unavailable (${res.status})`, res.status);
    return parseOpenMeteoForecast(destination, await res.json(), startDate, endDate);
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
