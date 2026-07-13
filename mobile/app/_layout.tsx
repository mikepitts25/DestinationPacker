import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { Stack, useSegments, useRouter } from 'expo-router';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { lightTheme, Colors } from '@/constants/theme';
import { usersApi } from '@/services/api';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';
import type { Session } from '@supabase/supabase-js';

// Travelers are routinely offline (planes, roaming, hotel basements), so the
// query cache persists to disk and mutations pause until connectivity returns.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const QUERY_CACHE_KEY = 'destinationpacker.query-cache';
const LAST_USER_KEY = 'destinationpacker.last_user';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000, gcTime: CACHE_MAX_AGE },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_KEY,
  throttleTime: 1000,
});

// Loads the profile from Supabase, falling back to the last profile cached on
// this device (or a minimal profile from the session) when the network is
// unreachable, so an offline cold start keeps the user signed in.
async function loadUserWithFallback(session: Session): Promise<User> {
  try {
    const user = await usersApi.me();
    AsyncStorage.setItem(LAST_USER_KEY, JSON.stringify(user)).catch(() => {});
    return user;
  } catch {
    try {
      const raw = await AsyncStorage.getItem(LAST_USER_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.id === session.user.id) return cached as User;
      }
    } catch {
      // Fall through to the minimal session-derived profile.
    }

    return {
      id: session.user.id,
      email: session.user.email ?? '',
      display_name:
        typeof session.user.user_metadata?.display_name === 'string'
          ? session.user.user_metadata.display_name
          : null,
      subscription: 'free',
      preferences: {},
      created_at: session.user.created_at ?? new Date().toISOString(),
      is_anonymous: !!session.user.is_anonymous,
    };
  }
}

// Pure-effect component: runs after the Stack is mounted so router calls work
function AuthGuard() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isLoading, setUser, setSessionToken, setLoading } = useAuthStore();

  useEffect(() => {
    let active = true;

    const handleRecoveryUrl = async (url: string | null) => {
      if (!url) return;

      const normalizedUrl = url.replace('#', '?');
      const parsed = Linking.parse(normalizedUrl);
      const accessToken = parsed.queryParams?.access_token;
      const refreshToken = parsed.queryParams?.refresh_token;
      const type = parsed.queryParams?.type;

      if (
        typeof accessToken === 'string' &&
        typeof refreshToken === 'string' &&
        type === 'recovery'
      ) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error && active) {
          router.replace('/reset-password');
        }
      }
    };

    const loadSession = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        setSessionToken(data.session?.access_token ?? null);

        if (data.session) {
          const user = await loadUserWithFallback(data.session);
          if (active) setUser(user);
        } else if (active) {
          setUser(null);
        }
      } catch {
        if (active) {
          setSessionToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSessionToken(session?.access_token ?? null);

      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const user = await loadUserWithFallback(session);
        setUser(user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    loadSession();
    Linking.getInitialURL().then(handleRecoveryUrl).catch(() => {});
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      handleRecoveryUrl(url).catch(() => {});
    });

    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const tripId = response.notification.request.content.data?.tripId;
        if (typeof tripId === 'string' && tripId) {
          router.push(`/trip/${tripId}`);
        }
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
      linkingSubscription.remove();
      notificationSubscription.remove();
    };
  }, [router, setLoading, setSessionToken, setUser]);

  // Clear locally cached data when the user signs out so trips and profile
  // details never leak to the next account on a shared device.
  const wasAuthenticated = useRef(false);
  useEffect(() => {
    if (isLoading) return;
    if (wasAuthenticated.current && !isAuthenticated) {
      queryClient.clear();
      AsyncStorage.multiRemove([QUERY_CACHE_KEY, LAST_USER_KEY]).catch(() => {});
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, isLoading]);

  // Redirect based on auth state once loading is done
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inPublicRoute = segments[0] === 'privacy' || segments[0] === 'terms';
    if (!isAuthenticated && !inAuthGroup) {
      if (!inPublicRoute) router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, router, segments]);

  return null;
}

export default function RootLayout() {
  const { isLoading } = useAuthStore();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: CACHE_MAX_AGE, buster: 'v1' }}
    >
      <PaperProvider theme={lightTheme}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="trip" options={{ headerShown: false }} />
            <Stack.Screen
              name="reset-password"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="upgrade-account"
              options={{ headerShown: true, title: 'Save Your Trips', presentation: 'modal' }}
            />
            <Stack.Screen
              name="premium"
              options={{ headerShown: true, title: 'Go Premium', presentation: 'modal' }}
            />
            <Stack.Screen
              name="privacy"
              options={{ headerShown: true, title: 'Privacy Policy' }}
            />
            <Stack.Screen
              name="terms"
              options={{ headerShown: true, title: 'Terms of Service' }}
            />
          </Stack>
          <AuthGuard />
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
        </SafeAreaProvider>
      </PaperProvider>
    </PersistQueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});
