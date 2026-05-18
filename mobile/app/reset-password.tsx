import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, TextInput, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usersApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const { setUser } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetPassword = async () => {
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await usersApi.confirmPasswordReset('', '', password);
      setUser(result.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'This reset link is invalid or expired.');
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
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Choose a new password for your DestinationPacker account.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="New password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
            autoComplete="new-password"
            autoFocus
          />
          <TextInput
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={styles.input}
            secureTextEntry
            autoComplete="new-password"
          />
          <HelperText type="error" visible={!!error}>{error}</HelperText>

          <Button
            mode="contained"
            onPress={handleSetPassword}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Update Password
          </Button>
          <Button mode="text" onPress={() => router.replace('/(auth)/login')}>
            Back to Sign In
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, paddingHorizontal: Spacing.lg, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  title: { ...Typography.h2, color: Colors.primary, marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, color: Colors.muted, textAlign: 'center' },
  form: { marginBottom: Spacing.lg },
  input: { marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  button: { marginTop: Spacing.sm, borderRadius: 12 },
  buttonContent: { paddingVertical: Spacing.sm },
});
