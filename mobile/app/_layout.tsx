import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';
import { lightTheme, Colors } from '@/constants/theme';
import { usersApi, setAuthToken } from '@/services/api';
import { BackendIndicator } from '@/components/BackendIndicator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60 * 1000 },
  },
});

export const AUTH_TOKEN_KEY = 'auth_token';

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { setLoading, setUser } = useAuthStore();
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          setAuthToken(token);
          const user = await usersApi.me();
          setUser(user);
        } else {
          router.replace('/(auth)/login');
        }
      } catch {
        // Token expired or invalid
        await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
        setAuthToken(null);
        router.replace('/(auth)/login');
      } finally {
        setLoading(false);
        setBooted(true);
      }
    };
    init();
  }, []);

  if (!booted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={lightTheme}>
        <SafeAreaProvider>
          <AuthBootstrap>
            <BackendIndicator />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="trip" options={{ headerShown: false }} />
              <Stack.Screen
                name="premium"
                options={{ headerShown: true, title: 'Go Premium', presentation: 'modal' }}
              />
            </Stack>
          </AuthBootstrap>
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
