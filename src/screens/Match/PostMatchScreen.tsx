import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {Colors, Typography, Spacing, Radii, Shadows} from '../../constants/theme';
import type {Match, MatchPlayer} from '../../types/models';
import type {HomeStackParamList} from '../../navigation/AppNavigator';
import {getMatchById, getMatchPlayers, completeMatch} from '../../services/supabase/matchesService';
import {submitRatings} from '../../services/supabase/ratingsService';
import {getCurrentUser} from '../../services/supabase/client';
import {getMyTeam} from '../../services/supabase/teamsService';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'PostMatch'>;
type RouteType = RouteProp<HomeStackParamList, 'PostMatch'>;

// ── RatingSelector ───────────────────────────────────────────────────────────

const RatingSelector = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => (
  <View style={r.ratingRow}>
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
      const active = value >= n;
      return (
        <TouchableOpacity
          key={n}
          style={[r.ratingDot, active && r.ratingDotActive]}
          onPress={() => onChange(n)}
          activeOpacity={0.7}>
          <Text style={[r.ratingDotText, active && r.ratingDotTextActive]}>{n}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const r = StyleSheet.create({
  ratingRow: {flexDirection: 'row', gap: 4, flexWrap: 'wrap'},
  ratingDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ratingDotText: {fontSize: 11, fontWeight: Typography.bold, color: Colors.textMuted},
  ratingDotTextActive: {color: '#fff'},
});

// ── PostMatchScreen ───────────────────────────────────────────────────────────

const PostMatchScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const {matchId} = route.params;

  const [step, setStep] = useState<0 | 1 | 2>(0); // 0=loading, 1=scores, 2=ratings
  const [match, setMatch] = useState<Match | null>(null);
  const [myTeamId, setMyTeamId] = useState('');
  const [myUserId, setMyUserId] = useState('');
  const [opponentPlayers, setOpponentPlayers] = useState<MatchPlayer[]>([]);

  const [scoreChallenger, setScoreChallenger] = useState('');
  const [scoreOpponent, setScoreOpponent] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    const [fetchedMatch, team, user] = await Promise.all([
      getMatchById(matchId),
      getMyTeam(),
      getCurrentUser(),
    ]);

    if (!fetchedMatch || !team || !user) {
      Alert.alert('Hata', 'Maç bilgileri yüklenemedi.', [
        {text: 'Geri', onPress: () => navigation.goBack()},
      ]);
      return;
    }

    setMatch(fetchedMatch);
    setMyTeamId(team.id);
    setMyUserId(user.id);

    const players = await getMatchPlayers(matchId);
    const opponents = players.filter(p => p.teamId !== team.id);
    setOpponentPlayers(opponents);

    // Init all ratings at 7
    const initRatings: Record<string, number> = {};
    opponents.forEach(p => { initRatings[p.userId] = 7; });
    setRatings(initRatings);

    setStep(1);
  }, [matchId, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  const handleScoreNext = () => {
    const sc = parseInt(scoreChallenger, 10);
    const so = parseInt(scoreOpponent, 10);
    if (isNaN(sc) || isNaN(so) || sc < 0 || so < 0) {
      Alert.alert('Hata', 'Geçerli bir skor gir.');
      return;
    }
    if (sc === so) {
      Alert.alert('Hata', 'Beraberlik olmaz. Kazananı belirleyecek bir skor gir.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!match) {return;}
    const sc = parseInt(scoreChallenger, 10);
    const so = parseInt(scoreOpponent, 10);
    const winnerTeamId = sc > so ? match.challengerTeamId : match.opponentTeamId!;

    setSubmitting(true);
    try {
      await completeMatch(matchId, sc, so, winnerTeamId);

      const ratingsList = Object.entries(ratings).map(([userId, score]) => ({
        userId,
        score,
      }));
      if (ratingsList.length > 0) {
        await submitRatings(matchId, ratingsList);
      }

      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Hata oluştu';
      Alert.alert('Hata', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (step === 0) {
    return (
      <View style={s.screen}>
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </View>
    );
  }

  // ── Done screen ──────────────────────────────────────────────────────────

  if (done && match) {
    const sc = parseInt(scoreChallenger, 10);
    const so = parseInt(scoreOpponent, 10);
    const weWon = sc > so
      ? myTeamId === match.challengerTeamId
      : myTeamId === match.opponentTeamId;
    const myScore = myTeamId === match.challengerTeamId ? sc : so;
    const theirScore = myTeamId === match.challengerTeamId ? so : sc;

    return (
      <View style={s.screen}>
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={s.doneScroll} showsVerticalScrollIndicator={false}>
            <Text style={s.doneEmoji}>{weWon ? '🏆' : '💪'}</Text>
            <Text style={s.doneTitle}>{weWon ? 'Kazandınız!' : 'İyi maçtı!'}</Text>
            <Text style={s.doneSub}>
              {weWon ? 'Tebrikler, muhteşem bir performans!' : 'Reytingini iyileştirmeye devam et.'}
            </Text>

            <View style={s.scoreCard}>
              <View style={s.scoreTeam}>
                <Text style={s.scoreTeamName} numberOfLines={1}>
                  {myTeamId === match.challengerTeamId ? match.challengerTeamName : match.opponentTeamName}
                </Text>
                <Text style={[s.scoreNum, {color: weWon ? Colors.accentGreen : Colors.accentRed}]}>
                  {myScore}
                </Text>
              </View>
              <Text style={s.scoreDash}>–</Text>
              <View style={[s.scoreTeam, {alignItems: 'flex-end'}]}>
                <Text style={s.scoreTeamName} numberOfLines={1}>
                  {myTeamId === match.challengerTeamId ? match.opponentTeamName : match.challengerTeamName}
                </Text>
                <Text style={[s.scoreNum, {color: weWon ? Colors.accentRed : Colors.accentGreen}]}>
                  {theirScore}
                </Text>
              </View>
            </View>

            <View style={s.ratingNote}>
              <Text style={s.ratingNoteText}>
                Rakip oyuncuların reytingleri güncelleniyor. Kendi reytingini görmek için profil sekmesini kontrol et.
              </Text>
            </View>

            <TouchableOpacity
              style={s.doneBtn}
              onPress={() => navigation.navigate('HomeMain')}
              activeOpacity={0.85}>
              <Text style={s.doneBtnText}>Ana Sayfaya Dön</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Step 1: Score entry ──────────────────────────────────────────────────

  if (step === 1 && match) {
    return (
      <View style={s.screen}>
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <View style={s.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={s.backText}>← Geri</Text>
            </TouchableOpacity>
            <Text style={s.topTitle}>Maç Sonu</Text>
            <View style={s.dotsRow}>
              <View style={[s.dot, s.dotActive]} />
              <View style={s.dot} />
            </View>
          </View>

          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <Text style={s.stepTitle}>Skoru Gir</Text>
            <Text style={s.stepSub}>Maç sonucunu girerek reytinglerin güncellenmesini sağla.</Text>

            <View style={s.scoreInputSection}>
              {/* Challenger */}
              <View style={s.scoreInputBlock}>
                <Text style={s.scoreInputTeamName} numberOfLines={2}>
                  {match.challengerTeamName}
                </Text>
                <TextInput
                  style={s.scoreInput}
                  value={scoreChallenger}
                  onChangeText={setScoreChallenger}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  textAlign="center"
                />
              </View>

              <View style={s.scoreVs}>
                <Text style={s.scoreVsText}>–</Text>
              </View>

              {/* Opponent */}
              <View style={s.scoreInputBlock}>
                <Text style={s.scoreInputTeamName} numberOfLines={2}>
                  {match.opponentTeamName ?? 'Rakip'}
                </Text>
                <TextInput
                  style={s.scoreInput}
                  value={scoreOpponent}
                  onChangeText={setScoreOpponent}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  textAlign="center"
                />
              </View>
            </View>

            <View style={s.infoBox}>
              <Text style={s.infoText}>
                Beraberlik girişi geçersizdir. Kazanan takım reytingini kazanır, kaybeden takım kaybeder.
              </Text>
            </View>
          </ScrollView>

          <View style={s.bottomBar}>
            <TouchableOpacity
              style={[s.primaryBtn, (!scoreChallenger || !scoreOpponent) && s.primaryBtnDisabled]}
              disabled={!scoreChallenger || !scoreOpponent}
              onPress={handleScoreNext}
              activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>Devam → Oyuncu Reytingllerine Geç</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Step 2: Rate players ─────────────────────────────────────────────────

  if (step === 2 && match) {
    return (
      <View style={s.screen}>
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <View style={s.topBar}>
            <TouchableOpacity onPress={() => setStep(1)} activeOpacity={0.8}>
              <Text style={s.backText}>← Geri</Text>
            </TouchableOpacity>
            <Text style={s.topTitle}>Oyuncu Reytingllerine</Text>
            <View style={s.dotsRow}>
              <View style={[s.dot, s.dotActive]} />
              <View style={[s.dot, s.dotActive]} />
            </View>
          </View>

          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <Text style={s.stepTitle}>Rakipleri Değerlendir</Text>
            <Text style={s.stepSub}>
              Maçta oynayan rakip oyuncuları 1–10 arası puanla.
            </Text>

            {opponentPlayers.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>Değerlendirme yapılacak oyuncu yok.</Text>
              </View>
            ) : (
              <View style={s.playerRatingList}>
                {opponentPlayers.map(player => (
                  <View key={player.userId} style={s.playerRatingCard}>
                    <View style={s.playerRatingHeader}>
                      <View style={s.playerAvatar}>
                        <Text style={s.playerAvatarEmoji}>⛹️</Text>
                      </View>
                      <View style={s.playerRatingInfo}>
                        <Text style={s.playerRatingName}>{player.username}</Text>
                        <Text style={s.playerRatingCurrent}>
                          Puan: <Text style={{color: Colors.primary, fontWeight: Typography.black}}>
                            {ratings[player.userId] ?? 7}
                          </Text>/10
                        </Text>
                      </View>
                    </View>
                    <RatingSelector
                      value={ratings[player.userId] ?? 7}
                      onChange={v =>
                        setRatings(prev => ({...prev, [player.userId]: v}))
                      }
                    />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={s.bottomBar}>
            <TouchableOpacity
              style={[s.primaryBtn, submitting && s.primaryBtnDisabled]}
              disabled={submitting}
              onPress={handleSubmit}
              activeOpacity={0.85}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnText}>Maçı Tamamla & Kaydet 🏀</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return null;
};

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backText: {color: Colors.primary, fontSize: Typography.base, fontWeight: Typography.semibold},
  topTitle: {fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary},
  dotsRow: {flexDirection: 'row', gap: 6, alignItems: 'center'},
  dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border},
  dotActive: {backgroundColor: Colors.primary},

  scroll: {flexGrow: 1, padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.lg},
  stepTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  stepSub: {fontSize: Typography.sm, color: Colors.textMuted, lineHeight: 20},

  // Score entry
  scoreInputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.md,
  },
  scoreInputBlock: {flex: 1, alignItems: 'center', gap: Spacing.sm},
  scoreInputTeamName: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  scoreInput: {
    width: '100%',
    height: 80,
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: 2,
    borderColor: Colors.border,
    fontSize: 40,
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  scoreVs: {alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8},
  scoreVsText: {fontSize: Typography.xl, fontWeight: Typography.black, color: Colors.textMuted},

  infoBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  infoText: {fontSize: Typography.xs, color: Colors.textMuted, lineHeight: 18, textAlign: 'center'},

  // Player ratings
  playerRatingList: {gap: Spacing.md},
  playerRatingCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.card,
  },
  playerRatingHeader: {flexDirection: 'row', alignItems: 'center', gap: Spacing.md},
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarEmoji: {fontSize: 22},
  playerRatingInfo: {flex: 1},
  playerRatingName: {fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary},
  playerRatingCurrent: {fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2},

  emptyBox: {
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {fontSize: Typography.sm, color: Colors.textMuted},

  // Bottom bar
  bottomBar: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radii.xl,
    alignItems: 'center',
    ...Shadows.glow,
  },
  primaryBtnDisabled: {opacity: 0.4},
  primaryBtnText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},

  // Done screen
  doneScroll: {
    flexGrow: 1,
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
    paddingTop: Spacing.xxxl,
  },
  doneEmoji: {fontSize: 80},
  doneTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  doneSub: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    width: '100%',
    gap: Spacing.md,
    ...Shadows.card,
  },
  scoreTeam: {flex: 1, alignItems: 'flex-start', gap: 6},
  scoreTeamName: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  scoreNum: {fontSize: 52, fontWeight: Typography.black, letterSpacing: -2},
  scoreDash: {fontSize: Typography.xxl, fontWeight: Typography.black, color: Colors.textMuted},
  ratingNote: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    padding: Spacing.lg,
    width: '100%',
  },
  ratingNoteText: {fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20},
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radii.xl,
    alignItems: 'center',
    ...Shadows.glow,
  },
  doneBtnText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},
});

export default PostMatchScreen;
