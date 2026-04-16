import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Avatar, Button, Divider, Switch, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, isPremium, signOut } = useAuthStore();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* User info */}
        <View style={styles.header}>
          <Avatar.Text
            size={72}
            label={(user?.display_name ?? user?.email ?? 'U')[0].toUpperCase()}
            style={{ backgroundColor: Colors.primary }}
          />
          <Text style={styles.name}>{user?.display_name ?? 'Traveler'}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
          <View style={[styles.badge, isPremium ? styles.premiumBadge : styles.freeBadge]}>
            <Text style={[styles.badgeText, isPremium && styles.premiumBadgeText]}>
              {isPremium ? '⭐ Premium' : 'Free Plan'}
            </Text>
          </View>
        </View>

        {/* Upgrade CTA for free users */}
        {!isPremium && (
          <TouchableOpacity style={styles.upgradeCard} onPress={() => router.push('/premium')}>
            <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
            <Text style={styles.upgradeSubtitle}>Ad-free • AI packing lists • Unlimited trips • Collaboration</Text>
            <Text style={styles.upgradePrice}>From $3.99/month</Text>
          </TouchableOpacity>
        )}

        <View style={styles.section}>
          <List.Section>
            <List.Subheader style={styles.subheader}>Account</List.Subheader>
            <List.Item
              title="Edit Profile"
              left={() => <List.Icon icon="account-edit" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title="Notifications"
              description="Departure reminders"
              left={() => <List.Icon icon="bell-outline" />}
              right={() => <Switch value={true} onValueChange={() => {}} />}
            />
            <Divider />
            <List.Item
              title="Subscription"
              description={isPremium ? 'Premium — manage billing' : 'Upgrade to Premium'}
              left={() => <List.Icon icon="star-outline" color={isPremium ? Colors.premiumGold : undefined} />}
              onPress={() => router.push('/premium')}
            />
          </List.Section>

          <List.Section>
            <List.Subheader style={styles.subheader}>Preferences</List.Subheader>
            <List.Item
              title="Default packing items"
              description="Items always included in your lists"
              left={() => <List.Icon icon="format-list-checks" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title="Travel interests"
              description="Helps AI personalize suggestions"
              left={() => <List.Icon icon="heart-outline" />}
              onPress={() => {}}
            />
          </List.Section>

          <List.Section>
            <List.Subheader style={styles.subheader}>Support</List.Subheader>
            <List.Item
              title="Help & FAQ"
              left={() => <List.Icon icon="help-circle-outline" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title="Rate the App"
              left={() => <List.Icon icon="star-outline" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title="Privacy Policy"
              left={() => <List.Icon icon="shield-outline" />}
              onPress={() => {}}
            />
          </List.Section>
        </View>

        <Button
          mode="outlined"
          onPress={signOut}
          style={styles.signOutButton}
          textColor={Colors.error}
        >
          Sign Out
        </Button>

        <Text style={styles.version}>DestinationPacker v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },
  header: { alignItems: 'center', paddingVertical: Spacing.xl, backgroundColor: Colors.surface },
  name: { ...Typography.h2, color: Colors.onSurface, marginTop: Spacing.sm },
  email: { ...Typography.body, color: Colors.muted },
  badge: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  freeBadge: {},
  premiumBadge: { backgroundColor: '#fff8e1', borderColor: Colors.premiumGold },
  badgeText: { ...Typography.label, color: Colors.muted },
  premiumBadgeText: { color: '#f57f17' },
  upgradeCard: {
    margin: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: 14,
  },
  upgradeTitle: { ...Typography.h3, color: '#fff', marginBottom: 4 },
  upgradeSubtitle: { ...Typography.caption, color: 'rgba(255,255,255,0.85)', marginBottom: Spacing.sm },
  upgradePrice: { ...Typography.label, color: '#fff', fontWeight: '700' },
  section: { backgroundColor: Colors.surface, marginTop: Spacing.sm },
  subheader: { ...Typography.caption, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  signOutButton: {
    margin: Spacing.lg,
    borderColor: Colors.error,
  },
  version: { ...Typography.caption, color: Colors.muted, textAlign: 'center', marginBottom: Spacing.lg },
});
