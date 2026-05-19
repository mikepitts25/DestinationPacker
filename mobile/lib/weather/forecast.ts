import { classifyWeather } from '@/lib/packing/ruleEngine';
import type { WeatherDay, WeatherForecast, WeatherForecastSource } from '@/types';

const OPEN_METEO_SOURCE: WeatherForecastSource = {
  name: 'Open-Meteo',
  url: 'https://open-meteo.com/',
};

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

export function daysUntil(date: string): number {
  const today = new Date();
  const start = new Date(`${date}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  return Math.floor((start.getTime() - today.getTime()) / 86400000);
}

export function unavailableForecast(destination: string, summary: string): WeatherForecast {
  return {
    destination,
    days: [],
    conditions: [],
    summary,
    source: OPEN_METEO_SOURCE,
    updated_at: new Date().toISOString(),
  };
}

export function forecastDaysForTrip(startDate?: string, endDate?: string): number {
  if (endDate) {
    return Math.min(16, Math.max(1, daysUntil(endDate) + 1));
  }

  if (startDate) {
    return Math.min(16, Math.max(1, daysUntil(startDate) + 7));
  }

  return 7;
}

export function parseOpenMeteoForecast(
  destination: string,
  data: any,
  startDate?: string,
  endDate?: string,
): WeatherForecast {
  const updated_at = new Date().toISOString();
  const daily = data?.daily ?? {};
  const dates = daily.time ?? [];
  const tempMaxes = daily.temperature_2m_max ?? [];
  const tempMins = daily.temperature_2m_min ?? [];
  const weatherCodes = daily.weathercode ?? daily.weather_code ?? [];
  const rainProbabilities = daily.precipitation_probability_max ?? [];
  const days: WeatherDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startBound = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const endBound = endDate ? new Date(`${endDate}T00:00:00`) : null;
  const effectiveStart = startBound && startBound > today ? startBound : today;

  for (let i = 0; i < Math.min(16, dates.length); i += 1) {
    const date = new Date(`${dates[i]}T00:00:00`);
    if (startDate && date < effectiveStart) continue;
    if (endBound && date > endBound) continue;

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
      rain_probability: Number.isFinite(Number(rainProbabilities[i])) ? Number(rainProbabilities[i]) : null,
      icon: has_snow ? 'snow' : has_rain ? 'rain' : avg_temp > 27 ? 'sunny' : 'cloudy',
    });
  }

  if (startDate && days.length === 0) {
    return unavailableForecast(
      destination,
      'Weather forecast is not available for these trip dates. Check dates within the current Open-Meteo forecast window for accurate data.',
    );
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
    source: OPEN_METEO_SOURCE,
    updated_at,
  };
}
