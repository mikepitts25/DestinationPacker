export type ActivityRatingFields = {
  rating?: number | null;
  review_count?: number | null;
  rating_source?: string | null;
};

export function formatActivityRating(activity: ActivityRatingFields): string | null {
  if (typeof activity.rating !== 'number' || !Number.isFinite(activity.rating)) {
    return null;
  }

  const ratingText = `★ ${activity.rating.toFixed(1)}`;
  const source = activity.rating_source?.trim();
  const reviewCount = typeof activity.review_count === 'number' && activity.review_count > 0
    ? Math.round(activity.review_count).toLocaleString('en-US')
    : null;

  if (reviewCount && source) return `${ratingText} · ${reviewCount} ${source} reviews`;
  if (reviewCount) return `${ratingText} · ${reviewCount} reviews`;
  if (source) return `${ratingText} · ${source}`;
  return ratingText;
}
