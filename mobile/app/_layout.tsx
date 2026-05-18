import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { Stack, useSegments, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { lightTheme, Colors } from '@/constants/theme';
import { usersApi } from '@/services/api';
import { supabase } from '@/lib/supabase';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000 },
  },
});

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
          const user = await usersApi.me();
          if (active) setUser(user);
        } else if (active) {
          setUser(null);
        }
      } catch {
        await supabase.auth.signOut();
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
        const user = await usersApi.me();
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

    return () => {
      active = false;
      listener.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, [router, setLoading, setSessionToken, setUser]);

  // Redirect based on auth state once loading is done
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  const { isLoading } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
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
              name="premium"
              options={{ headerShown: true, title: 'Go Premium', presentation: 'modal' }}
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
    </QueryClientProvider>
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
