import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '@/constants/theme';

const UPDATED_AT = 'June 3, 2026';
const PRIVACY_POLICY_URL = 'https://colibricodellc.com/privacy-policy';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: {UPDATED_AT}</Text>
        <Text style={styles.url}>{PRIVACY_POLICY_URL}</Text>

        <Text style={styles.paragraph}>
          DestinationPacker helps you create travel packing lists, destination ideas, weather
          summaries, and activity suggestions. This policy explains what information the app uses
          and how it is handled.
        </Text>

        <Text style={styles.heading}>Information We Use</Text>
        <Text style={styles.paragraph}>
          We use your email address, optional display name, trip details, destinations, dates,
          traveler counts, activity interests, packing items, and selected activities to provide the
          app experience. If you use password reset, Supabase Auth handles the reset email flow.
        </Text>

        <Text style={styles.heading}>Third-Party Services</Text>
        <Text style={styles.paragraph}>
          The app uses Supabase for authentication and app data, Open-Meteo for weather forecasts,
          OpenStreetMap/Nominatim/Overpass for destination and activity data, and Gemini through a
          Supabase Edge Function for optional AI packing suggestions. Only the information needed to
          perform each request is sent to these services.
        </Text>

        <Text style={styles.heading}>Location</Text>
        <Text style={styles.paragraph}>
          DestinationPacker uses destination coordinates you choose during trip planning to suggest
          nearby activities and weather. This version does not request device location permission.
        </Text>

        <Text style={styles.heading}>Account Deletion</Text>
        <Text style={styles.paragraph}>
          You can request account deletion from the Profile screen. Deleting your account removes
          your Supabase account profile and app data associated with it.
        </Text>

        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.paragraph}>
          For privacy questions, contact the app owner through the support contact listed in App
          Store Connect.
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
  url: { ...Typography.caption, color: Colors.primary, marginBottom: Spacing.lg },
  heading: { ...Typography.h3, color: Colors.primary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  paragraph: { ...Typography.body, color: Colors.onSurface, lineHeight: 22 },
});
