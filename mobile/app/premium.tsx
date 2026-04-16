import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Spacing, Typography } from '@/constants/theme';

const FEATURES = [
  { icon: '🚫', title: 'Ad-free experience', free: false, premium: true },
  { icon: '🤖', title: 'AI-powered packing lists', description: 'Personalized by Claude AI', free: false, premium: true },
  { icon: '✈️', title: 'Saved trips', free: '3 max', premium: 'Unlimited' },
  { icon: '🗺️', title: 'AI activity recommendations', description: 'Curated for your interests', free: false, premium: true },
  { icon: '👥', title: 'Trip collaboration', description: 'Share & edit with travel companions', free: false, premium: true },
  { icon: '📤', title: 'Export packing list', description: 'PDF & share via messaging', free: false, premium: true },
  { icon: '📋', title: 'Custom templates', description: 'Save reusable packing lists', free: false, premium: true },
  { icon: '🔔', title: 'Departure reminders', free: true, premium: true },
];

export default function PremiumScreen() {
  const handleMonthly = async () => {
    // TODO: Integrate RevenueCat purchase flow
    // const { customerInfo } = await Purchases.purchasePackage(monthlyPackage);
    console.log('Purchase monthly');
    router.back();
  };

  const handleAnnual = async () => {
    // TODO: Integrate RevenueCat purchase flow
    console.log('Purchase annual');
    router.back();
  };

  const handleRestore = () => {
    // TODO: Purchases.restorePurchases()
    console.log('Restore purchases');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>⭐</Text>
          <Text style={styles.heroTitle}>DestinationPacker Premium</Text>
          <Text style={styles.heroSubtitle}>
            Pack smarter. Travel better.
          </Text>
        </View>

        {/* Feature comparison */}
        <View style={styles.comparison}>
          <View style={styles.comparisonHeader}>
            <View style={styles.comparisonCol} />
            <View style={[styles.comparisonCol, styles.comparisonColCenter]}>
              <Text style={styles.colHeaderFree}>Free</Text>
            </View>
            <View style={[styles.comparisonCol, styles.comparisonColPremium]}>
              <Text style={styles.colHeaderPremium}>Premium</Text>
            </View>
          </View>

          {FEATURES.map((feature, i) => (
            <View key={i} style={[styles.featureRow, i % 2 === 0 && styles.featureRowAlt]}>
              <View style={styles.comparisonCol}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <View>
                  <Text style={styles.featureName}>{feature.title}</Text>
                  {feature.description && <Text style={styles.featureDesc}>{feature.description}</Text>}
                </View>
              </View>
              <View style={[styles.comparisonCol, styles.comparisonColCenter]}>
                <Text style={styles.featureVal}>
                  {feature.free === false ? '✗' : feature.free === true ? '✓' : feature.free}
                </Text>
              </View>
              <View style={[styles.comparisonCol, styles.comparisonColPremium]}>
                <Text style={[styles.featureVal, styles.premiumCheck]}>
                  {feature.premium === true ? '✓' : feature.premium}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing cards */}
        <View style={styles.pricingSection}>
          <TouchableOpacity style={[styles.pricingCard, styles.pricingCardAnnual]} onPress={handleAnnual}>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>SAVE 37%</Text>
            </View>
            <Text style={styles.pricingTitle}>Annual</Text>
            <Text style={styles.pricingPrice}>$29.99/year</Text>
            <Text style={styles.pricingPer}>= $2.50/month</Text>
            <Text style={styles.trialBadge}>7-day free trial</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pricingCard} onPress={handleMonthly}>
            <Text style={styles.pricingTitle}>Monthly</Text>
            <Text style={styles.pricingPrice}>$3.99/month</Text>
            <Text style={styles.pricingPer}>Cancel anytime</Text>
          </TouchableOpacity>
        </View>

        <Button
          mode="contained"
          onPress={handleAnnual}
          style={styles.ctaButton}
          contentStyle={styles.ctaButtonContent}
        >
          Start Free Trial
        </Button>

        <Text style={styles.legalText}>
          Cancel anytime. Subscriptions renew automatically. Manage in your App Store / Google Play account settings.
        </Text>

        <Button mode="text" onPress={handleRestore} textColor={Colors.muted}>
          Restore Purchases
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  hero: { alignItems: 'center', marginBottom: Spacing.xl },
  heroEmoji: { fontSize: 56, marginBottom: Spacing.sm },
  heroTitle: { ...Typography.h1, color: Colors.onSurface, marginBottom: 4 },
  heroSubtitle: { ...Typography.body, color: Colors.muted },
  comparison: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  comparisonHeader: { flexDirection: 'row', backgroundColor: Colors.background, paddingVertical: Spacing.sm },
  comparisonCol: { flex: 2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, gap: 6 },
  comparisonColCenter: { flex: 1, justifyContent: 'center' },
  comparisonColPremium: { flex: 1, justifyContent: 'center', backgroundColor: '#e8f0fe' },
  colHeaderFree: { ...Typography.label, color: Colors.muted, textAlign: 'center' },
  colHeaderPremium: { ...Typography.label, color: Colors.primary, fontWeight: '700', textAlign: 'center' },
  featureRow: { flexDirection: 'row', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  featureRowAlt: { backgroundColor: Colors.background },
  featureIcon: { fontSize: 18 },
  featureName: { ...Typography.label, color: Colors.onSurface },
  featureDesc: { ...Typography.caption, color: Colors.muted },
  featureVal: { ...Typography.body, color: Colors.error, textAlign: 'center', fontWeight: '700' },
  premiumCheck: { color: Colors.secondary },
  pricingSection: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  pricingCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  pricingCardAnnual: {
    borderColor: Colors.primary,
    position: 'relative',
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  saveBadgeText: { ...Typography.caption, color: '#fff', fontWeight: '700' },
  pricingTitle: { ...Typography.h3, color: Colors.onSurface, marginTop: Spacing.sm },
  pricingPrice: { ...Typography.h2, color: Colors.primary, marginTop: 4 },
  pricingPer: { ...Typography.caption, color: Colors.muted },
  trialBadge: { ...Typography.label, color: Colors.secondary, marginTop: 4 },
  ctaButton: { borderRadius: 12, marginBottom: Spacing.md },
  ctaButtonContent: { paddingVertical: Spacing.sm },
  legalText: { ...Typography.caption, color: Colors.muted, textAlign: 'center', marginBottom: Spacing.md },
});
