import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { lightTheme } from '@/constants/theme';
import { usersApi } from '@/services/api';
import { BackendIndicator } from '@/components/BackendIndicator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { setLoading, setUser, setFirebaseToken } = useAuthStore();

  useEffect(() => {
    // In production: listen to Firebase Auth state changes here
    // For now, mark loading as done (unauthenticated state)
    setLoading(false);
  }, []);

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
                options={{
                  headerShown: true,
                  title: 'Go Premium',
                  presentation: 'modal',
                }}
              />
            </Stack>
          </AuthBootstrap>
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
