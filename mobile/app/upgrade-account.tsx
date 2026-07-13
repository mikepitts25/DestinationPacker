import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, Button, TextInput, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usersApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function UpgradeAccountScreen() {
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setError('');
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await usersApi.upgradeAccount({
        email,
        password,
        display_name: displayName || undefined,
      });
      setUser(result.user);

      if (result.pendingEmailConfirmation) {
        Alert.alert(
          'One more step',
          'We sent a confirmation link to your email. Your trips are already saved to this account.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        Alert.alert(
          'Account created',
          'Your trips are now saved to your account.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <View style={styles.hero}>
          <Text style={styles.emoji}>🔐</Text>
          <Text style={styles.title}>Keep your trips</Text>
          <Text style={styles.subtitle}>
            Add an email and password to your guest session. Everything you have
            created stays exactly as it is.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Display name (optional)"
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
            autoCapitalize="words"
          />

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
            autoComplete="new-password"
          />

          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleUpgrade}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Create My Account
          </Button>
        </View>
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
    fontSize: 56,
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
    lineHeight: 22,
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
  buttonContent: {
    paddingVertical: Spacing.sm,
  },
});
