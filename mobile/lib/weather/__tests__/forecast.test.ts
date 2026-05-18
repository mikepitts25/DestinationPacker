import { forecastDaysForTrip, parseOpenMeteoForecast } from '../forecast';

function isoDate(offsetDays: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function forecastFixture() {
  return {
    daily: {
      time: [isoDate(0), isoDate(1), isoDate(2), isoDate(3)],
      temperature_2m_min: [12, 25, 26, 5],
      temperature_2m_max: [18, 34, 35, 9],
      weathercode: [61, 0, 0, 71],
    },
  };
}

describe('Open-Meteo forecast parsing', () => {
  it('filters forecast days to the trip window before classifying conditions', () => {
    const forecast = parseOpenMeteoForecast('Lisbon', forecastFixture(), isoDate(1), isoDate(2));

    expect(forecast.days.map((day) => day.date)).toEqual([isoDate(1), isoDate(2)]);
    expect(forecast.conditions).toContain('hot');
    expect(forecast.conditions).not.toContain('rain');
    expect(forecast.conditions).not.toContain('snow');
  });

  it('uses today through the end date for an in-progress trip', () => {
    const forecast = parseOpenMeteoForecast('Reykjavik', forecastFixture(), isoDate(-2), isoDate(1));

    expect(forecast.days.map((day) => day.date)).toEqual([isoDate(0), isoDate(1)]);
  });

  it('returns an unavailable state when no forecast days overlap the trip', () => {
    const forecast = parseOpenMeteoForecast('Tokyo', forecastFixture(), isoDate(10), isoDate(12));

    expect(forecast.days).toEqual([]);
    expect(forecast.conditions).toEqual([]);
    expect(forecast.summary).toMatch(/not available/i);
  });

  it('requests enough forecast days to reach the trip end, capped at Open-Meteo limits', () => {
    expect(forecastDaysForTrip(isoDate(3), isoDate(5))).toBe(6);
    expect(forecastDaysForTrip(isoDate(20), isoDate(30))).toBe(16);
  });
});
