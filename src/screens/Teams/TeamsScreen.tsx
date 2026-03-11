import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {Colors, Typography, Spacing, Radii, Shadows} from '../../constants/theme';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {TeamsStackParamList} from '../../navigation/AppNavigator';
import type {Team} from '../../types/models';
import {getMyTeam} from '../../services/supabase/teamsService';

type NavProp = NativeStackNavigationProp<TeamsStackParamList, 'TeamsMain'>;

const TeamsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTeam = useCallback(async () => {
    const data = await getMyTeam();
    setTeam(data);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadTeam();
  }, [loadTeam]));

  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>Takımlar</Text>
          {!team && (
            <TouchableOpacity
              style={s.createBtn}
              onPress={() => navigation.navigate('CreateTeam')}
              activeOpacity={0.8}>
              <Text style={s.createBtnText}>+ Takım Kur</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : team ? (
          <View style={s.content}>
            <View style={s.teamCard}>
              <View style={[s.logoCircle, {backgroundColor: team.logoColor + '33', borderColor: team.logoColor}]}>
                <Text style={s.logoEmoji}>🏀</Text>
              </View>
              <Text style={s.teamName}>{team.name}</Text>
              <Text style={s.teamCity}>{team.city.charAt(0).toUpperCase() + team.city.slice(1)}</Text>

              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={s.statValue}>{team.members.length}</Text>
                  <Text style={s.statLabel}>Üye</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={[s.statValue, {color: Colors.accentGreen}]}>{team.wins}</Text>
                  <Text style={s.statLabel}>Galibiyet</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={[s.statValue, {color: Colors.accentRed}]}>{team.losses}</Text>
                  <Text style={s.statLabel}>Mağlubiyet</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={[s.statValue, {color: Colors.accentGold}]}>{team.winStreak}</Text>
                  <Text style={s.statLabel}>Seri</Text>
                </View>
              </View>
            </View>

            <View style={s.membersSection}>
              <Text style={s.sectionTitle}>KADRO</Text>
              {team.members.map(member => (
                <View key={member.userId} style={s.memberRow}>
                  <View style={s.memberAvatar}>
                    <Text style={s.memberAvatarEmoji}>⛹️</Text>
                  </View>
                  <View style={s.memberInfo}>
                    <Text style={s.memberName}>{member.username}</Text>
                    <Text style={s.memberRole}>{member.role === 'captain' ? 'Kaptan' : 'Oyuncu'}</Text>
                  </View>
                  <Text style={s.memberRating}>{member.avgRating.toFixed(1)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={s.center}>
            <Text style={s.emptyIcon}>🏀</Text>
            <Text style={s.emptyTitle}>Takımın yok</Text>
            <Text style={s.emptySub}>Bir takım kur veya daveti bekle.</Text>
            <TouchableOpacity
              style={s.cta}
              onPress={() => navigation.navigate('CreateTeam')}
              activeOpacity={0.85}>
              <Text style={s.ctaText}>Takım Kur</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {fontSize: Typography.xxl, fontWeight: Typography.black, color: Colors.textPrimary, letterSpacing: -0.5},
  createBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.full,
  },
  createBtnText: {color: '#fff', fontSize: Typography.sm, fontWeight: Typography.bold},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: Spacing.xl},
  emptyIcon: {fontSize: 52},
  emptyTitle: {fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary},
  emptySub: {fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center'},
  cta: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 13,
    borderRadius: Radii.lg,
    marginTop: 4,
  },
  ctaText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},
  content: {flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.xl},
  teamCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.card,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {fontSize: 36},
  teamName: {fontSize: Typography.xl, fontWeight: Typography.heavy, color: Colors.textPrimary},
  teamCity: {fontSize: Typography.sm, color: Colors.textMuted},
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  statItem: {flex: 1, paddingVertical: Spacing.md, alignItems: 'center', gap: 2},
  statValue: {fontSize: Typography.xl, fontWeight: Typography.heavy, color: Colors.textPrimary},
  statLabel: {fontSize: Typography.xs, color: Colors.textMuted},
  statDivider: {width: 1, height: 36, backgroundColor: Colors.border},
  membersSection: {gap: Spacing.md},
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    letterSpacing: 1.2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarEmoji: {fontSize: 20},
  memberInfo: {flex: 1},
  memberName: {fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary},
  memberRole: {fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2},
  memberRating: {fontSize: Typography.lg, fontWeight: Typography.black, color: Colors.accentGold},
});

export default TeamsScreen;
