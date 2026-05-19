import { formatActivityRating } from '../rating';

describe('activity rating formatting', () => {
  it('formats rating with review count and source', () => {
    expect(formatActivityRating({
      rating: 4.7,
      review_count: 1234,
      rating_source: 'Google',
    })).toBe('★ 4.7 · 1,234 Google reviews');
  });

  it('formats rating with source when review count is unavailable', () => {
    expect(formatActivityRating({
      rating: 4.5,
      review_count: null,
      rating_source: 'Tripadvisor',
    })).toBe('★ 4.5 · Tripadvisor');
  });

  it('returns null when rating is unavailable', () => {
    expect(formatActivityRating({
      rating: null,
      review_count: 24,
      rating_source: 'Google',
    })).toBeNull();
  });
});
