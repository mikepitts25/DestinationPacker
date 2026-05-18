import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, TextInput, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usersApi } from '@/services/api';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    setError('');
    if (!email) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    try {
      await usersApi.requestPasswordReset(email);
      setSent(true);
    } catch {
      // Avoid email enumeration. Supabase will only send mail for valid accounts.
      setSent(true);
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
        <View style={styles.header}>
          <Text style={styles.emoji}>Reset</Text>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {sent
              ? 'If an account exists for that email, Supabase will send a secure reset link.'
              : 'Enter your email and we will send a secure reset link.'}
          </Text>
        </View>

        <View style={styles.form}>
          {!sent && (
            <>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
              />
              <HelperText type="error" visible={!!error}>{error}</HelperText>
              <Button
                mode="contained"
                onPress={handleRequestReset}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Send Reset Link
              </Button>
            </>
          )}

          {sent && (
            <Button
              mode="contained"
              onPress={() => router.replace('/(auth)/login')}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Back to Sign In
            </Button>
          )}

          {!sent && (
            <Button mode="text" onPress={() => router.back()} style={{ marginTop: Spacing.sm }}>
              Back to Sign In
            </Button>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, paddingHorizontal: Spacing.lg, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  emoji: { ...Typography.h2, color: Colors.primary, marginBottom: Spacing.md },
  title: { ...Typography.h2, color: Colors.primary, marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, color: Colors.muted, textAlign: 'center' },
  form: { marginBottom: Spacing.lg },
  input: { marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  button: { marginTop: Spacing.sm, borderRadius: 12 },
  buttonContent: { paddingVertical: Spacing.sm },
});
