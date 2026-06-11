import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { usersApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useTrips } from '@/hooks/useTrips';
import { Colors, Spacing, Radius } from '@/constants/theme';

type SettingRowProps = {
  emoji: string;
  label: string;
  description?: string;
  onPress?: () => void;
  right?: React.ReactNode;
};

function SettingRow({ emoji, label, description, onPress, right }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.settingIconBox}>
        <Text style={styles.settingEmoji}>{emoji}</Text>
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description ? <Text style={styles.settingDesc}>{description}</Text> : null}
      </View>
      {right ?? <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, isPremium, signOut, setUser, setSessionToken } = useAuthStore();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { data: trips } = useTrips();

  const initials = ((user?.display_name ?? user?.email ?? 'U')[0] ?? 'U').toUpperCase();
  const upcomingCount = trips?.filter(t => new Date(t.end_date) >= new Date()).length ?? 0;

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all saved trips, packing lists, and activities. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await usersApi.deleteAccount();
              setSessionToken(null);
              setUser(null);
              router.replace('/(auth)/login');
            } catch (error: any) {
              Alert.alert('Unable to Delete Account', error.message || 'Please try again.');
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Dark gradient header */}
      <SafeAreaView edges={['top']} style={styles.safeHeader}>
        <LinearGradient
          colors={[Colors.deepDark, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Avatar */}
          <LinearGradient
            colors={[Colors.gold, Colors.goldDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{user?.display_name ?? 'Traveler'}</Text>
            {isPremium && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
        </LinearGradient>
      </SafeAreaView>

      {/* White cream body */}
      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{trips?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{upcomingCount}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>—</Text>
              <Text style={styles.statLabel}>Items Packed</Text>
            </View>
          </View>

          {!isPremium && (
            <TouchableOpacity onPress={() => router.push('/premium')} style={styles.upgradeCard}>
              <LinearGradient
                colors={[Colors.gold, Colors.goldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeGradient}
              >
                <Text style={styles.upgradeTitle}>Premium Coming Soon</Text>
                <Text style={styles.upgradeSub}>AI packing lists · templates · exports</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Account section */}
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.card}>
            <SettingRow emoji="✏️" label="Edit Profile" onPress={() => {}} />
            <View style={styles.rowDivider} />
            <SettingRow emoji="🛡️" label="Privacy" onPress={() => router.push('/privacy')} />
            <View style={styles.rowDivider} />
            <SettingRow
              emoji="⭐"
              label="Subscription"
              description={isPremium ? 'Premium enabled' : 'Premium features coming soon'}
              onPress={() => router.push('/premium')}
            />
          </View>

          {/* App section */}
          <Text style={styles.sectionLabel}>APP</Text>
          <View style={styles.card}>
            <SettingRow emoji="🌐" label="Language" onPress={() => {}} />
            <View style={styles.rowDivider} />
            <SettingRow emoji="🌙" label="Dark Mode" right={<Switch value={false} onValueChange={() => {}} color={Colors.primary} />} />
            <View style={styles.rowDivider} />
            <SettingRow emoji="ℹ️" label="Terms of Service" onPress={() => router.push('/terms')} />
          </View>

          {/* Sign out */}
          <TouchableOpacity style={styles.signOut} onPress={signOut} activeOpacity={0.8}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteAccount, deletingAccount && styles.disabledAction]}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
            disabled={deletingAccount}
          >
            <Text style={styles.deleteAccountText}>
              {deletingAccount ? 'Deleting Account...' : 'Delete Account'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.version}>DestinationPacker v1.0.0</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.deepDark },
  safeHeader: { backgroundColor: 'transparent' },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl + 8,
    paddingHorizontal: Spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontSize: 18, fontWeight: '700', color: '#FFF9F4' },
  proBadge: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  proBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.8 },
  email: { fontSize: 13, color: 'rgba(255,249,244,0.65)' },
  body: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    overflow: 'hidden',
  },
  scroll: { paddingBottom: 120 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800', color: Colors.onSurface },
  statLabel: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.border },
  upgradeCard: { marginHorizontal: Spacing.md, marginTop: Spacing.md, borderRadius: Radius.md, overflow: 'hidden' },
  upgradeGradient: { padding: Spacing.md },
  upgradeTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  upgradeSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1.2,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  card: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: 12,
  },
  settingIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(10,147,150,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingEmoji: { fontSize: 16 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '500', color: Colors.onSurface },
  settingDesc: { fontSize: 12, color: Colors.muted, marginTop: 1 },
  chevron: { fontSize: 20, color: '#B0C4C6' },
  rowDivider: { height: 1, backgroundColor: '#F0F4F5', marginLeft: 60 },
  signOut: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: Colors.error },
  deleteAccount: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAccountText: { fontSize: 14, fontWeight: '600', color: Colors.error },
  disabledAction: { opacity: 0.5 },
  version: { fontSize: 12, color: Colors.muted, textAlign: 'center', marginTop: Spacing.lg, marginBottom: Spacing.md },
});
