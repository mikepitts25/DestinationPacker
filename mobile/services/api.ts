import { config } from '@/constants/config';
import type {
  User, Trip, TripCreate, PackingList, PackingItem,
  Activity, WeatherForecast,
} from '@/types';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${config.API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    const err = new ApiError(error.detail ?? 'Unknown error', res.status);
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
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

// ─── Auth types ──────────────────────────────────────────────────────────────

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const usersApi = {
  register: (data: { email: string; password: string; display_name?: string }) =>
    request<TokenResponse>('POST', '/users/register', data),

  login: (data: { email: string; password: string }) =>
    request<TokenResponse>('POST', '/users/login', data),

  me: () => request<User>('GET', '/users/me'),

  updateMe: (data: { display_name?: string; preferences?: Record<string, unknown> }) =>
    request<User>('PATCH', '/users/me', data),
};

// ─── Trips ───────────────────────────────────────────────────────────────────

export const tripsApi = {
  list: () => request<Trip[]>('GET', '/trips/'),

  create: (data: TripCreate) => request<Trip>('POST', '/trips/', data),

  get: (tripId: string) => request<Trip>('GET', `/trips/${tripId}`),

  update: (tripId: string, data: Partial<TripCreate>) =>
    request<Trip>('PATCH', `/trips/${tripId}`, data),

  delete: (tripId: string) => request<void>('DELETE', `/trips/${tripId}`),
};

// ─── Packing ─────────────────────────────────────────────────────────────────

export const packingApi = {
  getList: (tripId: string) => request<PackingList>('GET', `/trips/${tripId}/packing/`),

  generate: (tripId: string) =>
    request<PackingList>('POST', `/trips/${tripId}/packing/generate`),

  addItem: (tripId: string, data: { category: string; item_name: string; quantity: number; essential: boolean }) =>
    request<PackingItem>('POST', `/trips/${tripId}/packing/`, data),

  updateItem: (tripId: string, itemId: string, data: { packed?: boolean; quantity?: number; item_name?: string; category?: string }) =>
    request<PackingItem>('PATCH', `/trips/${tripId}/packing/${itemId}`, data),

  deleteItem: (tripId: string, itemId: string) =>
    request<void>('DELETE', `/trips/${tripId}/packing/${itemId}`),
};

// ─── Activities ───────────────────────────────────────────────────────────────

export const activitiesApi = {
  list: (tripId: string) => request<Activity[]>('GET', `/trips/${tripId}/activities/`),

  fetch: (tripId: string) =>
    request<Activity[]>('POST', `/trips/${tripId}/activities/fetch`),

  toggle: (tripId: string, activityId: string, selected: boolean) =>
    request<Activity>('PATCH', `/trips/${tripId}/activities/${activityId}/toggle`, { selected }),

  addCustom: (tripId: string, data: { activity_name: string; activity_type: string; description?: string }) =>
    request<Activity>('POST', `/trips/${tripId}/activities/`, data),
};

// ─── Weather ─────────────────────────────────────────────────────────────────

export const weatherApi = {
  getForecast: (lat: number, lon: number, destination: string) =>
    request<WeatherForecast>('GET', `/weather/forecast?lat=${lat}&lon=${lon}&destination=${encodeURIComponent(destination)}`),

  autocomplete: (query: string) =>
    request<{ place_id: string; description: string }[]>('GET', `/weather/places/autocomplete?query=${encodeURIComponent(query)}`),

  placeDetails: (placeId: string) =>
    request<{ name: string; lat: number; lon: number; country_code: string }>('GET', `/weather/places/details?place_id=${encodeURIComponent(placeId)}`),
};
