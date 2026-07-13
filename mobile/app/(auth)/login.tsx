import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, TextInput, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usersApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Typography } from '@/constants/theme';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const { setUser } = useAuthStore();

  const handleGuest = async () => {
    setError('');
    setGuestLoading(true);
    try {
      const result = await usersApi.loginAnonymously();
      setUser(result.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setGuestLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await usersApi.login({ email, password })
          : await usersApi.register({ email, password, display_name: displayName || undefined });

      setUser(result.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.hero}>
          <Text style={styles.emoji}>🧳</Text>
          <Text style={styles.title}>DestinationPacker</Text>
          <Text style={styles.subtitle}>
            Smart packing lists for every adventure
          </Text>
        </View>

        <View style={styles.form}>
          {mode === 'register' && (
            <TextInput
              label="Display name (optional)"
              value={displayName}
              onChangeText={setDisplayName}
              style={styles.input}
              autoCapitalize="words"
            />
          )}

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || guestLoading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>

          <Button
            mode="outlined"
            onPress={handleGuest}
            loading={guestLoading}
            disabled={loading || guestLoading}
            style={styles.guestButton}
            contentStyle={styles.buttonContent}
          >
            Try it without an account
          </Button>
          <Text style={styles.guestHint}>
            Jump straight in — you can create an account later to keep your trips.
          </Text>

          <Button
            mode="text"
            onPress={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
          >
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Button>

          {mode === 'login' && (
            <Button
              mode="text"
              onPress={() => router.push('/(auth)/forgot-password')}
              textColor={Colors.muted}
            >
              Forgot password?
            </Button>
          )}
        </View>

        <Text style={styles.terms}>
          By signing in, you agree to our{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/terms')}>
            Terms of Service
          </Text>
          {' '}and{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/privacy')}>
            Privacy Policy
          </Text>
          .
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emoji: {
    fontSize: 72,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'center',
  },
  form: {
    marginBottom: Spacing.lg,
  },
  input: {
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  button: {
    marginTop: Spacing.sm,
    borderRadius: 12,
  },
  guestButton: {
    marginTop: Spacing.sm,
    borderRadius: 12,
    borderColor: Colors.primary,
  },
  guestHint: {
    ...Typography.caption,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  buttonContent: {
    paddingVertical: Spacing.sm,
  },
  terms: {
    ...Typography.caption,
    color: Colors.muted,
    textAlign: 'center',
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
