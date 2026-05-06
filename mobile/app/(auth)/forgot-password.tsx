import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, TextInput, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usersApi, setAuthToken } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { AUTH_TOKEN_KEY } from '@/app/_layout';
import { Colors, Spacing, Typography } from '@/constants/theme';

type Step = 'email' | 'code' | 'password';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();

  const handleRequestCode = async () => {
    setError('');
    if (!email) { setError('Please enter your email.'); return; }
    setLoading(true);
    try {
      await usersApi.requestPasswordReset(email);
      setStep('code');
    } catch {
      // Always advance to code step to prevent email enumeration
      setStep('code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = () => {
    setError('');
    if (code.length !== 6) { setError('Enter the 6-digit code from your email.'); return; }
    setStep('password');
  };

  const handleResetPassword = async () => {
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const result = await usersApi.confirmPasswordReset(email, code, newPassword);
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, result.access_token);
      setAuthToken(result.access_token);
      setUser(result.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code.');
      setStep('code');
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
          <Text style={styles.emoji}>🔑</Text>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 'email' && 'Enter your email and we\'ll send a reset code.'}
            {step === 'code' && `We sent a 6-digit code to ${email}.`}
            {step === 'password' && 'Choose a new password.'}
          </Text>
        </View>

        <View style={styles.form}>
          {step === 'email' && (
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
                onPress={handleRequestCode}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Send Reset Code
              </Button>
            </>
          )}

          {step === 'code' && (
            <>
              <TextInput
                label="6-digit code"
                value={code}
                onChangeText={setCode}
                style={styles.input}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <HelperText type="info" visible>
                Check your email. If no email arrives, check your SMTP settings or server logs.
              </HelperText>
              <HelperText type="error" visible={!!error}>{error}</HelperText>
              <Button
                mode="contained"
                onPress={handleVerifyCode}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Continue
              </Button>
              <Button mode="text" onPress={handleRequestCode} loading={loading}>
                Resend code
              </Button>
            </>
          )}

          {step === 'password' && (
            <>
              <TextInput
                label="New password"
                value={newPassword}
                onChangeText={setNewPassword}
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
                onPress={handleResetPassword}
                loading={loading}
                disabled={loading}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Set New Password
              </Button>
            </>
          )}

          <Button mode="text" onPress={() => router.back()} style={{ marginTop: Spacing.sm }}>
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
  emoji: { fontSize: 56, marginBottom: Spacing.md },
  title: { ...Typography.h2, color: Colors.primary, marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, color: Colors.muted, textAlign: 'center' },
  form: { marginBottom: Spacing.lg },
  input: { marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  button: { marginTop: Spacing.sm, borderRadius: 12 },
  buttonContent: { paddingVertical: Spacing.sm },
});
