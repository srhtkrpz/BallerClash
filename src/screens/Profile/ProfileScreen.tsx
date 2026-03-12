import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors, Typography, Spacing, Radii, Shadows} from '../../constants/theme';
import {supabase} from '../../services/supabase/client';
import {useAuth} from '../../context/AuthContext';
import {getMyProfile} from '../../services/supabase/profilesService';
import {getMyMatches} from '../../services/supabase/matchesService';
import type {Profile, AvatarConfig, HairStyle, Match} from '../../types/models';
import type {RootStackParamList} from '../../navigation/AppNavigator';
import BasketbolcuAvatar, {type AvatarColors} from '../../components/BasketbolcuAvatar';

const DEFAULT_AVATAR: AvatarColors = {
  skin: '#F1C27D', hairColor: '#111111', hairStyle: 'short',
  eyeColor: '#3a2a1a', jerseyColor: '#f97316', jerseyNumber: 23,
  shortsColor: '#111111', shoesColor: '#111111',
};

function toAvatarColors(cfg?: AvatarConfig): AvatarColors {
  if (!cfg) {return DEFAULT_AVATAR;}
  return {
    skin:         cfg.skin          ?? DEFAULT_AVATAR.skin,
    hairColor:    cfg.hairColor     ?? DEFAULT_AVATAR.hairColor,
    hairStyle:    (cfg.hairStyle    ?? DEFAULT_AVATAR.hairStyle) as HairStyle,
    eyeColor:     cfg.eyeColor      ?? DEFAULT_AVATAR.eyeColor,
    jerseyColor:  cfg.jerseyColor   ?? DEFAULT_AVATAR.jerseyColor,
    jerseyNumber: cfg.jerseyNumber  ?? DEFAULT_AVATAR.jerseyNumber,
    shortsColor:  cfg.shorts        ?? DEFAULT_AVATAR.shortsColor,
    shoesColor:   cfg.shoes         ?? DEFAULT_AVATAR.shoesColor,
  };
}

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const StatBox = ({label, value, color}: {label: string; value: string | number; color?: string}) => (
  <View style={ps.statBox}>
    <Text style={[ps.statValue, color ? {color} : {}]}>{value}</Text>
    <Text style={ps.statLabel}>{label}</Text>
  </View>
);

const getRatingColor = (r: number) => {
  if (r >= 8.5) {return Colors.ratingElite;}
  if (r >= 7.0) {return Colors.ratingGood;}
  if (r >= 5.5) {return Colors.ratingAvg;}
  return Colors.ratingLow;
};

const ProfileScreen: React.FC = () => {
  const {user} = useAuth();
  const navigation = useNavigation<NavProp>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const data = await getMyProfile();
    if (!data) {
      navigation.navigate('Onboarding');
      setLoading(false);
      return;
    }
    setProfile(data);
    const allMatches = await getMyMatches();
    setMatchHistory(allMatches.filter(m => m.status === 'completed'));
    setLoading(false);
  }, [navigation]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadProfile();
  }, [loadProfile]));

  if (loading) {
    return (
      <View style={[ps.screen, {alignItems: 'center', justifyContent: 'center'}]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const displayRating = profile ? profile.avgRating.toFixed(1) : '—';
  const ratingColor = profile && profile.totalMatches > 0
    ? getRatingColor(profile.avgRating)
    : Colors.textPrimary;

  return (
    <View style={ps.screen}>
      <SafeAreaView style={ps.safe} edges={['top']}>
        <ScrollView contentContainerStyle={ps.scroll} showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={ps.avatarSection}>
            <View style={ps.avatarCircle}>
              <View style={ps.avatarCrop}>
                <BasketbolcuAvatar colors={toAvatarColors(profile?.avatarConfig)} size={185} />
              </View>
            </View>
            <Text style={ps.username}>{profile?.username ?? 'Kullanıcı'}</Text>
            <Text style={ps.email}>{user?.email}</Text>
            <TouchableOpacity
              style={ps.editBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AvatarEditor')}>
              <Text style={ps.editBtnText}>Avatar Düzenle</Text>
            </TouchableOpacity>
          </View>

          {/* Rating */}
          <View style={ps.ratingCard}>
            <Text style={ps.ratingLabel}>ORTALAMA REYTİNG</Text>
            <Text style={[ps.ratingValue, {color: ratingColor}]}>{displayRating}</Text>
            {profile && profile.totalMatches === 0 && (
              <Text style={ps.ratingNote}>Henüz maç yok</Text>
            )}
            {profile && profile.winStreak > 0 && (
              <Text style={ps.ratingNote}>🔥 {profile.winStreak} maçlık seri</Text>
            )}
          </View>

          {/* Stats grid */}
          <View style={ps.statsGrid}>
            <StatBox label="Maç" value={profile?.totalMatches ?? 0} />
            <StatBox label="Galibiyet" value={profile?.wins ?? 0} color={Colors.accentGreen} />
            <StatBox label="Mağlubiyet" value={profile?.losses ?? 0} color={Colors.accentRed} />
            <StatBox label="Seri" value={profile?.winStreak ?? 0} color={Colors.accentGold} />
          </View>

          {/* Match history */}
          <View style={ps.section}>
            <Text style={ps.sectionTitle}>MAÇ GEÇMİŞİ</Text>
            {matchHistory.length === 0 ? (
              <View style={ps.emptyBox}>
                <Text style={ps.emptyText}>Henüz tamamlanmış maç yok.</Text>
              </View>
            ) : (
              matchHistory.map(m => {
                const isChallenger = !!profile?.teamId && m.challengerTeamId === profile.teamId;
                const myScore  = isChallenger ? m.scoreChallenger : m.scoreOpponent;
                const oppScore = isChallenger ? m.scoreOpponent   : m.scoreChallenger;
                const opponent = isChallenger ? (m.opponentTeamName ?? 'Rakip') : m.challengerTeamName;
                const won = m.winnerTeamId === profile?.teamId;
                const date = new Date(m.scheduledAt).toLocaleDateString('tr-TR', {day: 'numeric', month: 'short', year: 'numeric'});
                return (
                  <View key={m.id} style={[ps.matchRow, won ? ps.matchRowWin : ps.matchRowLoss]}>
                    <View style={[ps.matchResult, won ? ps.matchResultWin : ps.matchResultLoss]}>
                      <Text style={ps.matchResultText}>{won ? 'G' : 'M'}</Text>
                    </View>
                    <View style={ps.matchInfo}>
                      <Text style={ps.matchOpponent} numberOfLines={1}>{opponent}</Text>
                      <Text style={ps.matchDate}>{date} · {m.courtName}</Text>
                    </View>
                    <Text style={[ps.matchScore, won ? {color: Colors.accentGreen} : {color: Colors.accentRed}]}>
                      {myScore ?? '?'}–{oppScore ?? '?'}
                    </Text>
                  </View>
                );
              })
            )}
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
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 2, borderColor: Colors.primary,
    overflow: 'hidden',
  },
  // size=185 → hair(y=34)→28.6px, waist(y=148)→124.5px
  // center of range = 76.5px; circle center = 55px → top = 55-76.5 = -21.5 ≈ -22
  avatarCrop: {
    position: 'absolute',
    top: -22,
    left: (110 - 185) / 2 + 12,
  },
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
  matchRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  matchRowWin:  {borderColor: `${Colors.accentGreen}40`},
  matchRowLoss: {borderColor: `${Colors.accentRed}30`},
  matchResult: {
    width: 32, height: 32, borderRadius: Radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  matchResultWin:  {backgroundColor: `${Colors.accentGreen}20`},
  matchResultLoss: {backgroundColor: `${Colors.accentRed}20`},
  matchResultText: {fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary},
  matchInfo: {flex: 1, gap: 2},
  matchOpponent: {fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary},
  matchDate: {fontSize: Typography.xs, color: Colors.textMuted},
  matchScore: {fontSize: Typography.base, fontWeight: Typography.bold},
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
