import { View, StyleSheet, Image } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function LoginScreen() {
  const handleGoogleSignIn = async () => {
    // TODO: Implement Firebase Google sign-in
    // const provider = new GoogleAuthProvider();
    // const result = await signInWithPopup(auth, provider);
    // const token = await result.user.getIdToken();
    // Register user with backend, then navigate
    router.replace('/(tabs)');
  };

  const handleAppleSignIn = async () => {
    // TODO: Implement Firebase Apple sign-in
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🧳</Text>
        <Text style={styles.title}>DestinationPacker</Text>
        <Text style={styles.subtitle}>
          Smart packing lists for every adventure
        </Text>
      </View>

      <View style={styles.features}>
        {[
          { icon: '🌦️', text: 'Weather-aware packing lists' },
          { icon: '🗺️', text: 'Activity-based recommendations' },
          { icon: '✅', text: 'Never forget anything again' },
        ].map(({ icon, text }) => (
          <View key={text} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{icon}</Text>
            <Text style={styles.featureText}>{text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.buttons}>
        <Button
          mode="contained"
          onPress={handleGoogleSignIn}
          style={styles.button}
          contentStyle={styles.buttonContent}
          icon="google"
        >
          Continue with Google
        </Button>
        <Button
          mode="outlined"
          onPress={handleAppleSignIn}
          style={[styles.button, styles.appleButton]}
          contentStyle={styles.buttonContent}
          icon="apple"
        >
          Continue with Apple
        </Button>
      </View>

      <Text style={styles.terms}>
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
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
  features: {
    marginBottom: Spacing.xxl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  featureText: {
    ...Typography.body,
    color: Colors.onSurface,
  },
  buttons: {
    marginBottom: Spacing.lg,
  },
  button: {
    marginBottom: Spacing.sm,
    borderRadius: 12,
  },
  appleButton: {
    borderColor: Colors.border,
  },
  buttonContent: {
    paddingVertical: Spacing.sm,
  },
  terms: {
    ...Typography.caption,
    color: Colors.muted,
    textAlign: 'center',
  },
});
