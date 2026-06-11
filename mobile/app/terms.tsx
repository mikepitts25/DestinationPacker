import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '@/constants/theme';

const UPDATED_AT = 'June 3, 2026';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.updated}>Last updated: {UPDATED_AT}</Text>

        <Text style={styles.paragraph}>
          By using DestinationPacker, you agree to use the app for personal travel planning and to
          provide accurate account information.
        </Text>

        <Text style={styles.heading}>Travel Planning</Text>
        <Text style={styles.paragraph}>
          Packing lists, weather summaries, activity suggestions, customs notes, and AI suggestions
          are planning aids only. You are responsible for checking airline rules, destination laws,
          health guidance, weather alerts, and customs restrictions before travel.
        </Text>

        <Text style={styles.heading}>Accounts</Text>
        <Text style={styles.paragraph}>
          You are responsible for keeping your account credentials secure. You may delete your
          account from the Profile screen when you no longer want to use the service.
        </Text>

        <Text style={styles.heading}>Premium Features</Text>
        <Text style={styles.paragraph}>
          Premium features may be introduced after payment processing is configured. Any paid
          subscription or purchase terms will be shown before purchase and managed through the
          applicable app store account settings.
        </Text>

        <Text style={styles.heading}>Acceptable Use</Text>
        <Text style={styles.paragraph}>
          Do not misuse the app, attempt to access another user&apos;s data, disrupt the service, or
          use automated requests in a way that harms the app or its providers.
        </Text>

        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.paragraph}>
          For support questions, use the support contact listed in App Store Connect.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { ...Typography.h1, color: Colors.onSurface, marginBottom: Spacing.xs },
  updated: { ...Typography.caption, color: Colors.muted, marginBottom: Spacing.lg },
  heading: { ...Typography.h3, color: Colors.primary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  paragraph: { ...Typography.body, color: Colors.onSurface, lineHeight: 22 },
});
