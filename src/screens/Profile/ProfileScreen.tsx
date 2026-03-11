import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radii, Shadows} from '../../constants/theme';
import {supabase} from '../../services/supabase/client';
import {useAuth} from '../../context/AuthContext';

const StatBox = ({label, value, color}: {label: string; value: string | number; color?: string}) => (
  <View style={ps.statBox}>
    <Text style={[ps.statValue, color ? {color} : {}]}>{value}</Text>
    <Text style={ps.statLabel}>{label}</Text>
  </View>
);

const ProfileScreen: React.FC = () => {
  const {user} = useAuth();

  return (
    <View style={ps.screen}>
      <SafeAreaView style={ps.safe} edges={['top']}>
        <ScrollView contentContainerStyle={ps.scroll} showsVerticalScrollIndicator={false}>

          {/* Avatar placeholder */}
          <View style={ps.avatarSection}>
            <View style={ps.avatarCircle}>
              <Text style={ps.avatarEmoji}>⛹️</Text>
            </View>
            <Text style={ps.username}>Kullanıcı</Text>
            <Text style={ps.email}>{user?.email}</Text>
            <TouchableOpacity style={ps.editBtn} activeOpacity={0.8}>
              <Text style={ps.editBtnText}>Avatar Düzenle</Text>
            </TouchableOpacity>
          </View>

          {/* Rating */}
          <View style={ps.ratingCard}>
            <Text style={ps.ratingLabel}>ORTALAMA REYTİNG</Text>
            <Text style={ps.ratingValue}>—</Text>
            <Text style={ps.ratingNote}>Henüz maç yok</Text>
          </View>

          {/* Stats grid */}
          <View style={ps.statsGrid}>
            <StatBox label="Maç" value="0" />
            <StatBox label="Galibiyet" value="0" color={Colors.accentGreen} />
            <StatBox label="Mağlubiyet" value="0" color={Colors.accentRed} />
            <StatBox label="Seri" value="0" color={Colors.accentGold} />
          </View>

          {/* Match history placeholder */}
          <View style={ps.section}>
            <Text style={ps.sectionTitle}>MAÇ GEÇMİŞİ</Text>
            <View style={ps.emptyBox}>
              <Text style={ps.emptyText}>Henüz tamamlanmış maç yok.</Text>
            </View>
          </View>

          {/* Sign out */}
          <TouchableOpacity
            style={ps.signOutBtn}
            onPress={() => supabase.auth.signOut()}
            activeOpacity={0.8}>
            <Text style={ps.signOutText}>Çıkış Yap</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const ps = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  scroll: {paddingBottom: Spacing.xxxl},
  avatarSection: {alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.lg, gap: 8},
  avatarCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 2, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: {fontSize: 48},
  username: {fontSize: Typography.xl, fontWeight: Typography.heavy, color: Colors.textPrimary},
  email: {fontSize: Typography.sm, color: Colors.textMuted},
  editBtn: {
    marginTop: 4,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editBtnText: {fontSize: Typography.sm, color: Colors.textSecondary},
  ratingCard: {
    margin: Spacing.lg,
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 4,
    ...Shadows.glow,
  },
  ratingLabel: {fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.primary, letterSpacing: 1},
  ratingValue: {fontSize: 52, fontWeight: Typography.black, color: Colors.textPrimary, letterSpacing: -2},
  ratingNote: {fontSize: Typography.sm, color: Colors.textMuted},
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  statBox: {flex: 1, padding: Spacing.lg, alignItems: 'center', gap: 4},
  statValue: {fontSize: Typography.xl, fontWeight: Typography.heavy, color: Colors.textPrimary},
  statLabel: {fontSize: Typography.xs, color: Colors.textMuted},
  section: {marginTop: Spacing.xl, paddingHorizontal: Spacing.lg, gap: Spacing.md},
  sectionTitle: {fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textMuted, letterSpacing: 1.2},
  emptyBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {fontSize: Typography.sm, color: Colors.textMuted},
  signOutBtn: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  signOutText: {color: Colors.accentRed, fontSize: Typography.sm, fontWeight: Typography.semibold},
});

export default ProfileScreen;
