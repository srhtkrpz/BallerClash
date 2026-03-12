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
import {getMyTeam, getTeamMembers} from '../../services/supabase/teamsService';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'PostMatch'>;
type RouteType = RouteProp<HomeStackParamList, 'PostMatch'>;

type Step = 'loading' | 'scores' | 'fairplay' | 'ratings' | 'done';

// ── RatingSelector ───────────────────────────────────────────────────────────

// 1=kırmızı → 10=yeşil, HSL hue geçişi (0°→120°)
function ratingColor(n: number): string {
  const hue = Math.round(((n - 1) / 9) * 120);
  return `hsl(${hue}, 85%, 45%)`;
}

const RatingSelector = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) => (
  <View style={rs.row}>
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
      const active = value >= n;
      const color = ratingColor(n);
      return (
        <TouchableOpacity
          key={n}
          style={[
            rs.dot,
            active
              ? {backgroundColor: color, borderColor: 'rgba(0,0,0,0.35)', borderWidth: 1}
              : rs.dotInactive,
          ]}
          onPress={() => onChange(n)}
          activeOpacity={0.7}>
          <Text style={[rs.dotText, active && rs.dotTextActive]}>{n}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const rs = StyleSheet.create({
  row: {flexDirection: 'row', gap: 4, flexWrap: 'wrap'},
  dot: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  dotInactive: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.35)',
  },
  dotText: {fontSize: 11, fontWeight: Typography.bold, color: Colors.textMuted},
  dotTextActive: {color: '#fff'},
});

// ── TopBar ───────────────────────────────────────────────────────────────────

const TopBar = ({
  onBack,
  title,
  currentStep,
  totalSteps,
}: {
  onBack: () => void;
  title: string;
  currentStep: number;
  totalSteps: number;
}) => (
  <View style={tb.bar}>
    <TouchableOpacity onPress={onBack} activeOpacity={0.8}>
      <Text style={tb.back}>← Geri</Text>
    </TouchableOpacity>
    <Text style={tb.title}>{title}</Text>
    <View style={tb.dots}>
      {Array.from({length: totalSteps}).map((_, i) => (
        <View key={i} style={[tb.dot, i < currentStep && tb.dotActive]} />
      ))}
    </View>
  </View>
);

const tb = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  back: {color: Colors.primary, fontSize: Typography.base, fontWeight: Typography.semibold},
  title: {fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary},
  dots: {flexDirection: 'row', gap: 6},
  dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border},
  dotActive: {backgroundColor: Colors.primary},
});

// ── PostMatchScreen ───────────────────────────────────────────────────────────

const PostMatchScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteType>();
  const {matchId} = route.params;

  const [step, setStep] = useState<Step>('loading');
  const [match, setMatch] = useState<Match | null>(null);
  const [myTeamId, setMyTeamId] = useState('');
  const [opponentPlayers, setOpponentPlayers] = useState<MatchPlayer[]>([]);

  const [scoreChallenger, setScoreChallenger] = useState('');
  const [scoreOpponent, setScoreOpponent] = useState('');
  const [finalScores, setFinalScores] = useState<{ch: number; op: number} | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [fetchedMatch, team] = await Promise.all([
      getMatchById(matchId),
      getMyTeam(),
    ]);

    if (!fetchedMatch || !team) {
      Alert.alert('Hata', 'Maç bilgileri yüklenemedi.', [
        {text: 'Geri', onPress: () => navigation.goBack()},
      ]);
      return;
    }

    setMatch(fetchedMatch);
    setMyTeamId(team.id);

    const players = await getMatchPlayers(matchId);
    let opponents = players.filter(p => p.teamId !== team.id);

    // Fallback: match_players boşsa (maç onayı öncesi üyeler eklenmemişse)
    // rakip takımın üyelerini doğrudan team_members'tan çek
    if (opponents.length === 0 && fetchedMatch.opponentTeamId && fetchedMatch.challengerTeamId) {
      const opponentTeamId = team.id === fetchedMatch.challengerTeamId
        ? fetchedMatch.opponentTeamId
        : fetchedMatch.challengerTeamId;
      const opponentMembers = await getTeamMembers(opponentTeamId);
      opponents = opponentMembers.map(m => ({
        id: m.userId,
        matchId,
        userId: m.userId,
        teamId: opponentTeamId,
        username: m.username,
        checkedIn: false,
        checkedInAt: undefined,
      }));
    }

    setOpponentPlayers(opponents);

    const initRatings: Record<string, number> = {};
    opponents.forEach(p => { initRatings[p.userId] = 7; });
    setRatings(initRatings);

    // If match already completed (arrived from MatchResultsScreen), skip score entry
    if (fetchedMatch.status === 'completed') {
      setFinalScores({
        ch: fetchedMatch.scoreChallenger ?? 0,
        op: fetchedMatch.scoreOpponent ?? 0,
      });
      setStep('fairplay');
    } else {
      setStep('scores');
    }
  }, [matchId, navigation]);

  useEffect(() => { load(); }, [load]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const parsedScores = () => {
    const sc = parseInt(scoreChallenger, 10);
    const so = parseInt(scoreOpponent, 10);
    return {sc, so, valid: !isNaN(sc) && !isNaN(so) && sc >= 0 && so >= 0 && sc !== so};
  };

  const handleScoreNext = () => {
    const {sc, so, valid} = parsedScores();
    if (!valid) {
      if (sc === so && !isNaN(sc)) {
        Alert.alert('Geçersiz Skor', 'Beraberlik olmaz. Kazananı belirleyecek bir skor gir.');
      } else {
        Alert.alert('Geçersiz Skor', 'Her iki takım için de geçerli bir skor gir.');
      }
      return;
    }
    setStep('fairplay');
  };

  const handleSubmit = async () => {
    if (!match) {return;}

    setSubmitting(true);
    try {
      // Only complete match if not already completed (i.e. not coming from MatchResultsScreen)
      if (match.status !== 'completed') {
        const {sc, so} = parsedScores();
        const winnerTeamId = sc > so ? match.challengerTeamId : match.opponentTeamId!;
        await completeMatch(matchId, sc, so, winnerTeamId);
        setFinalScores({ch: sc, op: so});
      }
      // If match was already completed, finalScores was set in load()

      const ratingsList = Object.entries(ratings).map(([userId, score]) => ({userId, score}));
      if (ratingsList.length > 0) {
        await submitRatings(matchId, ratingsList);
      }

      setStep('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Hata oluştu';
      Alert.alert('Hata', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════

  if (step === 'loading') {
    return (
      <View style={s.screen}>
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </View>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────

  if (step === 'done' && match) {
    const sc = finalScores?.ch ?? 0;
    const so = finalScores?.op ?? 0;
    const iChallenger = myTeamId === match.challengerTeamId;
    const weWon = iChallenger ? sc > so : so > sc;
    const myScore = iChallenger ? sc : so;
    const theirScore = iChallenger ? so : sc;
    const myTeamName = iChallenger ? match.challengerTeamName : (match.opponentTeamName ?? 'Rakip');
    const theirTeamName = iChallenger ? (match.opponentTeamName ?? 'Rakip') : match.challengerTeamName;

    return (
      <View style={s.screen}>
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={s.doneScroll} showsVerticalScrollIndicator={false}>
            <Text style={s.doneEmoji}>{weWon ? '🏆' : '💪'}</Text>
            <Text style={s.doneTitle}>{weWon ? 'Kazandınız!' : 'İyi Oyundu!'}</Text>
            <Text style={s.doneSub}>
              {weWon
                ? 'Tebrikler! Harika bir performans sergilediniz.'
                : 'Devam edin, bir sonraki maçta daha iyi olacaksınız.'}
            </Text>

            {/* Score card */}
            <View style={s.doneScoreCard}>
              <View style={s.doneScoreTeam}>
                <Text style={s.doneScoreTeamName} numberOfLines={1}>{myTeamName}</Text>
                <Text style={[s.doneScoreNum, {color: weWon ? Colors.accentGreen : Colors.accentRed}]}>
                  {myScore}
                </Text>
              </View>
              <Text style={s.doneScoreDash}>–</Text>
              <View style={[s.doneScoreTeam, {alignItems: 'flex-end'}]}>
                <Text style={s.doneScoreTeamName} numberOfLines={1}>{theirTeamName}</Text>
                <Text style={[s.doneScoreNum, {color: weWon ? Colors.accentRed : Colors.accentGreen}]}>
                  {theirScore}
                </Text>
              </View>
            </View>

            {/* Ratings note */}
            <View style={s.doneRatingBox}>
              <Text style={s.doneRatingIcon}>📊</Text>
              <Text style={s.doneRatingText}>
                Rakip oyuncuların reytingleri güncellendi. Kendi reytingini profilinden takip edebilirsin.
              </Text>
            </View>

            <TouchableOpacity
              style={s.doneBtn}
              onPress={() => navigation.navigate('HomeMain')}
              activeOpacity={0.85}>
              <Text style={s.doneBtnText}>Ana Sayfaya Dön 🏠</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── SCORES ───────────────────────────────────────────────────────

  if (step === 'scores' && match) {
    return (
      <View style={s.screen}>
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <TopBar
            onBack={() => navigation.goBack()}
            title="Maç Sonu"
            currentStep={1}
            totalSteps={3}
          />
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <Text style={s.stepTitle}>Maç Skorunu Gir</Text>
            <Text style={s.stepSub}>Her iki takımın son skorunu girerek reytinglerin güncellenmesini sağla.</Text>

            <View style={s.scoreSection}>
              <View style={s.scoreBlock}>
                <Text style={s.scoreTeamLabel} numberOfLines={2}>{match.challengerTeamName}</Text>
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

              <View style={s.scoreVsBlock}>
                <Text style={s.scoreVsText}>–</Text>
              </View>

              <View style={s.scoreBlock}>
                <Text style={s.scoreTeamLabel} numberOfLines={2}>
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
                ⚠️ Beraberlik girişi geçersizdir. Kazanan takım sıralamada yükselir, kaybeden düşer. Yanlış skor girmek reyting manipülasyonu sayılır.
              </Text>
            </View>
          </ScrollView>

          <View style={s.bottomBar}>
            <TouchableOpacity
              style={[s.primaryBtn, (!scoreChallenger || !scoreOpponent) && s.primaryBtnDisabled]}
              disabled={!scoreChallenger || !scoreOpponent}
              onPress={handleScoreNext}
              activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>Devam → Oyuncu Reytingleri</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── FAIR PLAY OATH ───────────────────────────────────────────────

  if (step === 'fairplay') {
    return (
      <View style={s.screen}>
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <TopBar
            onBack={() => finalScores && match?.status === 'completed' ? navigation.goBack() : setStep('scores')}
            title="Adil Oyna"
            currentStep={2}
            totalSteps={3}
          />
          <ScrollView contentContainerStyle={s.fairScroll} showsVerticalScrollIndicator={false}>

            {/* Header */}
            <View style={s.fairHeader}>
              <Text style={s.fairEmoji}>🤝</Text>
              <Text style={s.fairTitle}>ADİL OYNA KURALI</Text>
              <Text style={s.fairSubtitle}>Reytingleri vermeden önce lütfen oku</Text>
            </View>

            {/* Rules */}
            <View style={s.fairRulesCard}>
              <View style={s.fairRule}>
                <Text style={s.fairRuleIcon}>✅</Text>
                <Text style={s.fairRuleText}>
                  Oyuncuları <Text style={s.fairRuleBold}>sahadaki gerçek performanslarına</Text> göre puanla.
                </Text>
              </View>
              <View style={s.fairDivider} />
              <View style={s.fairRule}>
                <Text style={s.fairRuleIcon}>❌</Text>
                <Text style={s.fairRuleText}>
                  Arkadaşlarına yüksek, rakiplere düşük puan vermek{' '}
                  <Text style={s.fairRuleRed}>manipülasyon</Text> sayılır.
                </Text>
              </View>
              <View style={s.fairDivider} />
              <View style={s.fairRule}>
                <Text style={s.fairRuleIcon}>❌</Text>
                <Text style={s.fairRuleText}>
                  Anlaşmalı puanlama tespit edilirse{' '}
                  <Text style={s.fairRuleRed}>hesabın askıya alınır</Text> ve reytinglerin sıfırlanır.
                </Text>
              </View>
              <View style={s.fairDivider} />
              <View style={s.fairRule}>
                <Text style={s.fairRuleIcon}>⚖️</Text>
                <Text style={s.fairRuleText}>
                  Herkese adil puan vermek sahanın seviyesini yükseltir.{' '}
                  <Text style={s.fairRuleBold}>Sistemin güvenilirliği sende.</Text>
                </Text>
              </View>
            </View>

            {/* Rating guide */}
            <View style={s.fairGuideCard}>
              <Text style={s.fairGuideTitle}>PUANLAMA REHBERİ</Text>
              <View style={s.fairGuideRow}>
                <Text style={[s.fairGuideScore, {color: Colors.ratingElite}]}>9–10</Text>
                <Text style={s.fairGuideDesc}>Olağanüstü oyun, maçta fark yarattı</Text>
              </View>
              <View style={s.fairGuideRow}>
                <Text style={[s.fairGuideScore, {color: Colors.ratingGood}]}>7–8</Text>
                <Text style={s.fairGuideDesc}>İyi ve tutarlı performans</Text>
              </View>
              <View style={s.fairGuideRow}>
                <Text style={[s.fairGuideScore, {color: Colors.ratingAvg}]}>5–6</Text>
                <Text style={s.fairGuideDesc}>Ortalama, gelişime açık</Text>
              </View>
              <View style={s.fairGuideRow}>
                <Text style={[s.fairGuideScore, {color: Colors.ratingLow}]}>1–4</Text>
                <Text style={s.fairGuideDesc}>Kötü gün, çok zayıf katkı</Text>
              </View>
            </View>

          </ScrollView>

          <View style={s.bottomBar}>
            <TouchableOpacity
              style={s.oathBtn}
              onPress={() => setStep('ratings')}
              activeOpacity={0.85}>
              <Text style={s.oathBtnText}>Anladım, Adil Puanlayacağım 🤝</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── RATINGS ──────────────────────────────────────────────────────

  if (step === 'ratings' && match) {
    return (
      <View style={s.screen}>
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <TopBar
            onBack={() => setStep('fairplay')}
            title="Oyuncu Reytingleri"
            currentStep={3}
            totalSteps={3}
          />
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <Text style={s.stepTitle}>Rakipleri Değerlendir</Text>
            <Text style={s.stepSub}>
              {match.opponentTeamName ?? 'Rakip'} takımındaki oyuncuları 1–10 arası puanla.
            </Text>

            {opponentPlayers.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>Değerlendirme yapılacak kayıtlı oyuncu yok.</Text>
              </View>
            ) : (
              <View style={s.ratingList}>
                {opponentPlayers.map(player => {
                  const score = ratings[player.userId] ?? 7;
                  const ratingColor =
                    score >= 9 ? Colors.ratingElite :
                    score >= 7 ? Colors.ratingGood :
                    score >= 5 ? Colors.ratingAvg :
                    Colors.ratingLow;

                  return (
                    <View key={player.userId} style={s.ratingCard}>
                      <View style={s.ratingCardHeader}>
                        <View style={s.ratingAvatar}>
                          <Text style={s.ratingAvatarEmoji}>⛹️</Text>
                        </View>
                        <View style={s.ratingNameBlock}>
                          <Text style={s.ratingName}>{player.username}</Text>
                          <Text style={s.ratingScoreLabel}>
                            Puan:{' '}
                            <Text style={[s.ratingScoreValue, {color: ratingColor}]}>
                              {score}/10
                            </Text>
                          </Text>
                        </View>
                      </View>
                      <RatingSelector
                        value={score}
                        onChange={v => setRatings(prev => ({...prev, [player.userId]: v}))}
                      />
                    </View>
                  );
                })}
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

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  scroll: {flexGrow: 1, padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.lg},

  stepTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  stepSub: {fontSize: Typography.sm, color: Colors.textMuted, lineHeight: 20},

  // Score entry
  scoreSection: {flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm},
  scoreBlock: {flex: 1, alignItems: 'center', gap: Spacing.sm},
  scoreTeamLabel: {
    fontSize: Typography.sm, fontWeight: Typography.bold,
    color: Colors.textSecondary, textAlign: 'center',
  },
  scoreInput: {
    width: '100%', height: 80,
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    borderWidth: 2, borderColor: Colors.border,
    fontSize: 40, fontWeight: Typography.black,
    color: Colors.textPrimary,
  },
  scoreVsBlock: {paddingBottom: 24, alignItems: 'center'},
  scoreVsText: {fontSize: Typography.xl, fontWeight: Typography.black, color: Colors.textMuted},

  infoBox: {
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  infoText: {fontSize: Typography.xs, color: Colors.textMuted, lineHeight: 18, textAlign: 'center'},

  // Fair play
  fairScroll: {flexGrow: 1, padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.xl},
  fairHeader: {alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.md},
  fairEmoji: {fontSize: 56},
  fairTitle: {
    fontSize: Typography.xxl, fontWeight: Typography.black,
    color: Colors.textPrimary, letterSpacing: 1,
  },
  fairSubtitle: {fontSize: Typography.sm, color: Colors.textMuted},

  fairRulesCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.xl, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg, gap: 0, ...Shadows.card,
  },
  fairRule: {flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.md, alignItems: 'flex-start'},
  fairDivider: {height: 1, backgroundColor: Colors.divider},
  fairRuleIcon: {fontSize: 18, marginTop: 1},
  fairRuleText: {flex: 1, fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20},
  fairRuleBold: {fontWeight: Typography.bold, color: Colors.textPrimary},
  fairRuleRed: {fontWeight: Typography.bold, color: Colors.accentRed},

  fairGuideCard: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radii.xl, borderWidth: 1, borderColor: Colors.primaryGlow,
    padding: Spacing.lg, gap: Spacing.sm,
  },
  fairGuideTitle: {
    fontSize: Typography.xs, fontWeight: Typography.bold,
    color: Colors.primary, letterSpacing: 1, marginBottom: Spacing.xs,
  },
  fairGuideRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.md},
  fairGuideScore: {fontSize: Typography.base, fontWeight: Typography.black, width: 36},
  fairGuideDesc: {fontSize: Typography.sm, color: Colors.textSecondary, flex: 1},

  oathBtn: {
    backgroundColor: Colors.accentGreen,
    paddingVertical: Spacing.md, borderRadius: Radii.xl,
    alignItems: 'center', ...Shadows.card,
  },
  oathBtnText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},

  // Rating list
  ratingList: {gap: Spacing.md},
  ratingCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.xl, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg, gap: Spacing.md, ...Shadows.card,
  },
  ratingCardHeader: {flexDirection: 'row', alignItems: 'center', gap: Spacing.md},
  ratingAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  ratingAvatarEmoji: {fontSize: 22},
  ratingNameBlock: {flex: 1},
  ratingName: {fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary},
  ratingScoreLabel: {fontSize: Typography.sm, color: Colors.textMuted, marginTop: 2},
  ratingScoreValue: {fontWeight: Typography.black},

  emptyBox: {
    padding: Spacing.xl, alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radii.xl,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyText: {fontSize: Typography.sm, color: Colors.textMuted},

  // Bottom bar
  bottomBar: {
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  primaryBtn: {
    backgroundColor: Colors.primary, paddingVertical: Spacing.md,
    borderRadius: Radii.xl, alignItems: 'center', ...Shadows.glow,
  },
  primaryBtnDisabled: {opacity: 0.4},
  primaryBtnText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},

  // Done
  doneScroll: {
    flexGrow: 1, alignItems: 'center',
    padding: Spacing.xl, gap: Spacing.lg, paddingTop: Spacing.xxxl,
  },
  doneEmoji: {fontSize: 80},
  doneTitle: {
    fontSize: Typography.xxl, fontWeight: Typography.black,
    color: Colors.textPrimary, letterSpacing: -0.5, textAlign: 'center',
  },
  doneSub: {
    fontSize: Typography.base, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  doneScoreCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.xxl, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.xl, width: '100%', gap: Spacing.md, ...Shadows.card,
  },
  doneScoreTeam: {flex: 1, alignItems: 'flex-start', gap: 6},
  doneScoreTeamName: {
    fontSize: Typography.sm, fontWeight: Typography.bold,
    color: Colors.textSecondary, flexShrink: 1,
  },
  doneScoreNum: {fontSize: 52, fontWeight: Typography.black, letterSpacing: -2},
  doneScoreDash: {fontSize: Typography.xxl, fontWeight: Typography.black, color: Colors.textMuted},
  doneRatingBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.primaryGlow,
    padding: Spacing.lg, width: '100%',
  },
  doneRatingIcon: {fontSize: 20},
  doneRatingText: {flex: 1, fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20},
  doneBtn: {
    backgroundColor: Colors.primary, paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl, borderRadius: Radii.xl,
    alignItems: 'center', ...Shadows.glow,
  },
  doneBtnText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},
});

export default PostMatchScreen;
