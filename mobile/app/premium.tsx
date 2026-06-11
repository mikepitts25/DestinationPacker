import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Typography } from '@/constants/theme';

const FEATURES = [
  {
    icon: 'Plan',
    title: 'Trip readiness dashboard',
    description: 'See packing progress, activity coverage, weather status, and trip sparks in one place.',
  },
  {
    icon: 'AI',
    title: 'AI-curated destination ideas',
    description: 'Concrete sights, food classes, tastings, local buys, and experience ideas instead of generic lists.',
  },
  {
    icon: 'Share',
    title: 'Shareable packing lists',
    description: 'Send a clean checklist to a travel partner, notes app, or group chat before departure.',
  },
];

const ROADMAP = [
  {
    title: 'Smarter packing explanations',
    description: 'Show exactly which weather, activity, traveler, or trip detail caused each item.',
  },
  {
    title: 'Destination intelligence',
    description: 'Expand customs, food, souvenirs, import rules, closures, booking reminders, and local etiquette.',
  },
  {
    title: 'Collaboration and templates',
    description: 'Reusable packing templates, shared trips, and prep reminders for families and groups.',
  },
];

export default function PremiumScreen() {
  const { isPremium } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>DestinationPacker Plus</Text>
          <Text style={styles.heroTitle}>Built for serious trip prep</Text>
          <Text style={styles.heroSubtitle}>
            The app is moving from a packing checklist into a full pre-trip assistant:
            smarter suggestions, clearer decisions, and planning tools worth sharing.
          </Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>No purchase required in this version</Text>
          <Text style={styles.noticeText}>
            You can create trips, generate lists, explore activities, and share packing
            plans without upgrading. Purchase controls will appear only after App Store
            payments are fully configured.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Available now</Text>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureIconText}>{feature.icon}</Text>
            </View>
            <View style={styles.featureBody}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, styles.roadmapTitle]}>Next premium-grade upgrades</Text>
        {ROADMAP.map((item) => (
          <View key={item.title} style={styles.roadmapRow}>
            <Text style={styles.roadmapBullet}>✓</Text>
            <View style={styles.featureBody}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDescription}>{item.description}</Text>
            </View>
          </View>
        ))}

        {isPremium && (
          <View style={styles.status}>
            <Text style={styles.statusText}>Your account is marked Premium.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  hero: { alignItems: 'center', marginBottom: Spacing.xl },
  kicker: { ...Typography.label, color: Colors.primary, fontWeight: '700', marginBottom: Spacing.sm },
  heroTitle: { ...Typography.h1, color: Colors.onSurface, marginBottom: Spacing.sm, textAlign: 'center' },
  heroSubtitle: { ...Typography.body, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  notice: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  noticeTitle: { ...Typography.h3, color: Colors.onSurface, marginBottom: Spacing.sm },
  noticeText: { ...Typography.body, color: Colors.muted, lineHeight: 22 },
  sectionTitle: { ...Typography.h3, color: Colors.primary, marginBottom: Spacing.md },
  roadmapTitle: { marginTop: Spacing.lg },
  featureRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  roadmapRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: '#edf7f7',
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roadmapBullet: { ...Typography.body, color: Colors.primaryDark, fontWeight: '800', marginTop: 1 },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(10,147,150,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconText: { ...Typography.label, color: Colors.primary, fontWeight: '800' },
  featureBody: { flex: 1 },
  featureTitle: { ...Typography.label, color: Colors.onSurface, fontWeight: '700', marginBottom: 2 },
  featureDescription: { ...Typography.caption, color: Colors.muted, lineHeight: 18 },
  status: {
    backgroundColor: '#e6f4ea',
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  statusText: { ...Typography.body, color: Colors.secondary, fontWeight: '700' },
});
