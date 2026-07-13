import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { buildTripReminders, type TripReminderInput } from '@/lib/notifications/reminderTimes';

const SCHEDULED_MAP_KEY = 'destinationpacker.trip_notifications';
const CHANNEL_ID = 'trip-reminders';

type ScheduledMap = Record<string, string[]>;

async function readScheduledMap(): Promise<ScheduledMap> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_MAP_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeScheduledMap(map: ScheduledMap): Promise<void> {
  try {
    await AsyncStorage.setItem(SCHEDULED_MAP_KEY, JSON.stringify(map));
  } catch {
    // Reminder bookkeeping is best-effort.
  }
}

/**
 * Returns true when notifications may be scheduled. Requests permission the
 * first time, so callers should invoke this from a contextual moment (right
 * after the user creates a trip) rather than at app launch.
 */
export async function ensureNotificationSetup(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Trip reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

export async function scheduleTripReminders(trip: TripReminderInput): Promise<void> {
  try {
    await cancelTripReminders(trip.id);

    const reminders = buildTripReminders(trip);
    if (reminders.length === 0) return;
    if (!(await ensureNotificationSetup())) return;

    const ids: string[] = [];
    for (const reminder of reminders) {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: {
            title: reminder.title,
            body: reminder.body,
            data: { tripId: reminder.tripId },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminder.fireDate,
            channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
          },
        }),
      );
    }

    const map = await readScheduledMap();
    map[trip.id] = ids;
    await writeScheduledMap(map);
  } catch {
    // Never let reminder scheduling break trip creation.
  }
}

export async function cancelTripReminders(tripId: string): Promise<void> {
  try {
    const map = await readScheduledMap();
    const ids = map[tripId];
    if (!ids?.length) return;

    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
    delete map[tripId];
    await writeScheduledMap(map);
  } catch {
    // Best-effort cleanup.
  }
}
