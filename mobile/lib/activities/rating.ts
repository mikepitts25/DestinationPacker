export type ActivityRatingFields = {
  rating?: number | null;
  review_count?: number | null;
  rating_source?: string | null;
};

export type ActivityDistanceFields = {
  distance_from_center_km?: number | null;
};

export function hasPositiveActivityRating(activity: ActivityRatingFields): activity is ActivityRatingFields & { rating: number } {
  return typeof activity.rating === 'number' && Number.isFinite(activity.rating) && activity.rating > 0;
}

export function hasPositiveActivityDistance(activity: ActivityDistanceFields): activity is ActivityDistanceFields & { distance_from_center_km: number } {
  return typeof activity.distance_from_center_km === 'number' &&
    Number.isFinite(activity.distance_from_center_km) &&
    activity.distance_from_center_km > 0;
}

export function formatActivityRating(activity: ActivityRatingFields): string | null {
  if (!hasPositiveActivityRating(activity)) {
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

export function formatActivityDistance(activity: ActivityDistanceFields): string | null {
  if (!hasPositiveActivityDistance(activity)) return null;
  return `${activity.distance_from_center_km.toFixed(1)} km`;
}
