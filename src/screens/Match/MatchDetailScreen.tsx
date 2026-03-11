import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {Colors, Typography, Spacing, Radii, Shadows} from '../../constants/theme';
import type {Match, Team} from '../../types/models';
import type {HomeStackParamList} from '../../navigation/AppNavigator';
import {
  getMatchById,
  challengeMatch,
  confirmMatch,
  cancelChallenge,
} from '../../services/supabase/matchesService';
import {getMyTeam} from '../../services/supabase/teamsService';
import {getCurrentUser} from '../../services/supabase/client';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'MatchDetail'>;
type RouteType = RouteProp<HomeStackParamList, 'MatchDetail'>;

const CITY_LABEL: Record<string, string> = {
  istanbul: 'İstanbul',
  ankara: 'Ankara',
  izmir: 'İzmir',
};

const MatchDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const {matchId} = route.params;

  const [match, setMatch] = useState<Match | null>(null);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [myUserId, setMyUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    const [fetchedMatch, fetchedTeam, user] = await Promise.all([
      getMatchById(matchId),
      getMyTeam(),
      getCurrentUser(),
    ]);
    setMatch(fetchedMatch);
    setMyTeam(fetchedTeam);
    setMyUserId(user?.id ?? '');
    setLoading(false);
  }, [matchId]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadData();
  }, [loadData]));

  if (loading) {
    return (
      <View style={s.screen}>
        <SafeAreaView style={s.safe} edges={['bottom']}>
          <View style={s.center}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={s.screen}>
        <SafeAreaView style={s.safe} edges={['bottom']}>
          <View style={s.center}>
            <Text style={s.errorText}>Maç bulunamadı.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const amIChallenger = myTeam?.id === match.challengerTeamId;
  const amIOpponent = myTeam?.id === match.opponentTeamId;
  const amICaptain = myUserId === myTeam?.captainId;

  // Is this my own match (I created it)?
  const isMyMatch = amIChallenger;

  // Can I challenge: I have a team, I'm a captain, it's an open match, and my team is not already in it
  const canChallenge =
    match.status === 'open' &&
    myTeam !== null &&
    amICaptain &&
    !amIChallenger;

  // Can I accept/reject: I'm the challenger captain and there's a pending opponent
  const canRespond =
    match.status === 'pending' &&
    amIChallenger &&
    amICaptain;

  const handleChallenge = async () => {
    if (!myTeam) {
      return;
    }
    Alert.alert(
      'Meydan Oku',
      `${match.challengerTeamName} takımına meydan okumak istediğine emin misin?`,
      [
        {text: 'Vazgeç', style: 'cancel'},
        {
          text: 'Meydan Oku',
          onPress: async () => {
            setActionLoading(true);
            try {
              await challengeMatch(matchId, myTeam.id, myTeam.name);
              Alert.alert('Başarılı', 'Meydan okuman gönderildi! Rakibin kabul edene kadar bekle.', [
                {text: 'Tamam', onPress: () => navigation.goBack()},
              ]);
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Hata oluştu';
              Alert.alert('Hata', msg);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleAccept = async () => {
    Alert.alert(
      'Kabul Et',
      'Bu meydan okumayı kabul etmek istediğine emin misin?',
      [
        {text: 'Vazgeç', style: 'cancel'},
        {
          text: 'Kabul Et',
          onPress: async () => {
            setActionLoading(true);
            try {
              await confirmMatch(matchId);
              await loadData();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Hata oluştu';
              Alert.alert('Hata', msg);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleReject = async () => {
    Alert.alert(
      'Reddet',
      'Bu meydan okumayı reddetmek istediğine emin misin?',
      [
        {text: 'Vazgeç', style: 'cancel'},
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await cancelChallenge(matchId);
              await loadData();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Hata oluştu';
              Alert.alert('Hata', msg);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const scheduledDate = new Date(match.scheduledAt);
  const formattedDate = scheduledDate.toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const formattedTime = scheduledDate.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});

  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={s.hero}>
            {match.status === 'confirmed' && (
              <View style={s.confirmedBadge}>
                <View style={[s.badgeDot, {backgroundColor: Colors.accentGreen}]} />
                <Text style={s.confirmedBadgeText}>ONAYLANDI</Text>
              </View>
            )}
            {match.status === 'pending' && (
              <View style={s.pendingBadge}>
                <View style={[s.badgeDot, {backgroundColor: Colors.warning}]} />
                <Text style={s.pendingBadgeText}>YANIT BEKLENİYOR</Text>
              </View>
            )}
            {match.status === 'open' && (
              <View style={s.openBadge}>
                <View style={[s.badgeDot, {backgroundColor: Colors.accentGreen}]} />
                <Text style={s.openBadgeText}>RAKİP ARANIYOR</Text>
              </View>
            )}

            <Text style={s.heroCourtName}>{match.courtName}</Text>
            <View style={s.heroCityRow}>
              <Text style={s.heroCityBadge}>{CITY_LABEL[match.city] ?? match.city}</Text>
            </View>
            <View style={s.heroDateRow}>
              <Text style={s.heroDate}>📅 {formattedDate}</Text>
              <Text style={s.heroTime}>🕐 {formattedTime}</Text>
            </View>
          </View>

          {/* VS Section */}
          <View style={s.vsSection}>
            {/* Challenger team */}
            <View style={s.teamBox}>
              <View style={[s.teamLogoCircle, {backgroundColor: `${Colors.primary}30`}]}>
                <Text style={s.teamLogoEmoji}>🏀</Text>
              </View>
              <Text style={s.teamBoxName} numberOfLines={2}>{match.challengerTeamName}</Text>
              <Text style={s.teamBoxLabel}>Meydan Okuyan</Text>
            </View>

            {/* VS */}
            <View style={s.vsCenter}>
              <View style={s.vsCircle}>
                <Text style={s.vsText}>VS</Text>
              </View>
            </View>

            {/* Opponent team */}
            <View style={s.teamBox}>
              {match.opponentTeamName ? (
                <>
                  <View style={[s.teamLogoCircle, {backgroundColor: `${Colors.accentBlue}30`}]}>
                    <Text style={s.teamLogoEmoji}>🏀</Text>
                  </View>
                  <Text style={s.teamBoxName} numberOfLines={2}>{match.opponentTeamName}</Text>
                  <Text style={s.teamBoxLabel}>Rakip</Text>
                </>
              ) : (
                <>
                  <View style={[s.teamLogoCircle, {backgroundColor: Colors.surface}]}>
                    <Text style={s.teamLogoEmoji}>?</Text>
                  </View>
                  <Text style={[s.teamBoxName, {color: Colors.textMuted}]}>Rakip Bekleniyor</Text>
                  <Text style={s.teamBoxLabel}>Rakip</Text>
                </>
              )}
            </View>
          </View>

          {/* Confirmed — members */}
          {match.status === 'confirmed' && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Maç Onaylandı 🤝</Text>
              <Text style={s.sectionSub}>
                {match.challengerTeamName} vs {match.opponentTeamName} karşılaşması {formattedDate} tarihinde {formattedTime} saatinde {match.courtName} sahasında oynanacak.
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={s.actionsSection}>
            {/* Challenge button */}
            {canChallenge && (
              <TouchableOpacity
                style={[s.challengeBtn, actionLoading && s.btnDisabled]}
                onPress={handleChallenge}
                disabled={actionLoading}
                activeOpacity={0.85}>
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.challengeBtnText}>⚔️ Meydan Oku</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Accept/Reject buttons (for match creator when pending) */}
            {canRespond && (
              <View style={s.respondRow}>
                <TouchableOpacity
                  style={[s.rejectBtn, actionLoading && s.btnDisabled]}
                  onPress={handleReject}
                  disabled={actionLoading}
                  activeOpacity={0.8}>
                  <Text style={s.rejectBtnText}>Reddet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.acceptBtn, actionLoading && s.btnDisabled]}
                  onPress={handleAccept}
                  disabled={actionLoading}
                  activeOpacity={0.85}>
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.acceptBtnText}>Kabul Et 🤝</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Context message */}
            {!canChallenge && !canRespond && match.status === 'open' && amIChallenger && (
              <View style={s.infoBox}>
                <Text style={s.infoBoxText}>Bu senin maçın. Diğer kaptanlar sana meydan okuyabilir.</Text>
              </View>
            )}
            {match.status === 'pending' && amIOpponent && (
              <View style={s.infoBox}>
                <Text style={s.infoBoxText}>
                  Bu maça meydan okudun. Maç sahibi kabul etmeyi bekliyorsun.
                </Text>
              </View>
            )}
          </View>

          {/* Court & Match Info */}
          <View style={s.detailCard}>
            <Text style={s.detailCardTitle}>Maç Bilgileri</Text>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Saha</Text>
              <Text style={s.detailValue}>{match.courtName}</Text>
            </View>
            <View style={s.detailDivider} />
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Şehir</Text>
              <Text style={s.detailValue}>{CITY_LABEL[match.city] ?? match.city}</Text>
            </View>
            <View style={s.detailDivider} />
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Tarih</Text>
              <Text style={s.detailValue}>{formattedDate}</Text>
            </View>
            <View style={s.detailDivider} />
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Saat</Text>
              <Text style={s.detailValue}>{formattedTime}</Text>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  scroll: {flexGrow: 1, paddingBottom: Spacing.xxxl},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl},
  errorText: {color: Colors.textMuted, fontSize: Typography.base, textAlign: 'center'},

  // Hero
  hero: {
    padding: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.accentGreen}20`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  confirmedBadgeText: {fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.accentGreen},
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.warning}20`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  pendingBadgeText: {fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.warning},
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.accentGreen}20`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  openBadgeText: {fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.accentGreen},
  badgeDot: {width: 6, height: 6, borderRadius: 3},
  heroCourtName: {
    fontSize: Typography.xxl,
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroCityRow: {flexDirection: 'row'},
  heroCityBadge: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.primary,
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  heroDateRow: {flexDirection: 'row', gap: Spacing.lg, flexWrap: 'wrap'},
  heroDate: {fontSize: Typography.sm, color: Colors.textSecondary},
  heroTime: {fontSize: Typography.sm, color: Colors.textSecondary},

  // VS Section
  vsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  teamBox: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  teamLogoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoEmoji: {fontSize: 28},
  teamBoxName: {
    fontSize: Typography.base,
    fontWeight: Typography.heavy,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  teamBoxLabel: {fontSize: Typography.xs, color: Colors.textMuted},
  vsCenter: {alignItems: 'center', justifyContent: 'center'},
  vsCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {fontSize: Typography.sm, fontWeight: Typography.black, color: Colors.primary},

  // Confirmed section
  section: {
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  sectionTitle: {fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary},
  sectionSub: {fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20},

  // Actions
  actionsSection: {
    padding: Spacing.xl,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  challengeBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radii.xl,
    alignItems: 'center',
    ...Shadows.glow,
  },
  challengeBtnText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},
  respondRow: {flexDirection: 'row', gap: Spacing.sm},
  rejectBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
  },
  rejectBtnText: {color: Colors.textSecondary, fontSize: Typography.base, fontWeight: Typography.semibold},
  acceptBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radii.xl,
    backgroundColor: Colors.accentGreen,
    alignItems: 'center',
    ...Shadows.card,
  },
  acceptBtnText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},
  btnDisabled: {opacity: 0.4},
  infoBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoBoxText: {fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20},

  // Detail card
  detailCard: {
    margin: Spacing.xl,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  detailCardTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  detailLabel: {fontSize: Typography.sm, color: Colors.textMuted},
  detailValue: {fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary, flexShrink: 1, textAlign: 'right', marginLeft: Spacing.md},
  detailDivider: {height: 1, backgroundColor: Colors.divider},
});

export default MatchDetailScreen;
