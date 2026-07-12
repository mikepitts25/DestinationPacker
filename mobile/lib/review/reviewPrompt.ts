import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const REVIEW_PROMPTED_KEY = 'destinationpacker.review_prompted';

/** Lists smaller than this are too trivial to treat as a success moment. */
export const REVIEW_MIN_LIST_SIZE = 5;

export function isPackCompletionMoment(packedCount: number, totalCount: number): boolean {
  return totalCount >= REVIEW_MIN_LIST_SIZE && packedCount === totalCount;
}

/**
 * Ask for an App Store / Play Store rating at most once per install.
 * Intended to be called at a success moment (finishing a packing list),
 * per Apple guidance on requesting reviews after positive engagement.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    const alreadyPrompted = await AsyncStorage.getItem(REVIEW_PROMPTED_KEY);
    if (alreadyPrompted) return;

    if (!(await StoreReview.isAvailableAsync())) return;

    await AsyncStorage.setItem(REVIEW_PROMPTED_KEY, new Date().toISOString());
    await StoreReview.requestReview();
  } catch {
    // Review prompts are best-effort; never surface an error for them.
  }
}
