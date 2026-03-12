import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp, NativeStackScreenProps} from '@react-navigation/native-stack';
import {Colors, Typography, Spacing, Radii, Shadows} from '../../constants/theme';
import type {HomeStackParamList} from '../../navigation/AppNavigator';
import {
  submitMatchResult,
  getMatchResultVotes,
  finalizeMatch,
} from '../../services/supabase/matchesService';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'MatchResults'>;
type RouteProp = NativeStackScreenProps<HomeStackParamList, 'MatchResults'>['route'];

type Phase = 'input' | 'waiting' | 'agreed' | 'disagreed';

const ScoreInput = ({
  label,
  value,
  onChange,
  isWinner,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isWinner: boolean;
}) => (
  <View style={rs.scoreColumn}>
    <Text style={[rs.teamLabel, isWinner && rs.teamLabelWinner]} numberOfLines={1}>
      {isWinner ? '🏆 ' : ''}{label}
    </Text>
    <View style={[rs.scoreCard, isWinner && rs.scoreCardWinner]}>
      <TextInput
        style={rs.scoreInput}
        value={value}
        onChangeText={t => onChange(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        maxLength={3}
        placeholder="0"
        placeholderTextColor={Colors.textMuted}
        selectTextOnFocus
      />
    </View>
  </View>
);

const MatchResultsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp>();
  const {matchId, myRole, myTeamName, opponentTeamName, challengerTeamId, opponentTeamId} = route.params;

  // Scores: my team vs opponent team (stored as strings for TextInput)
  const [myScoreStr, setMyScoreStr] = useState('');
  const [oppScoreStr, setOppScoreStr] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [submitting, setSubmitting] = useState(false);
  const [disagreedMsg, setDisagreedMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myScore  = parseInt(myScoreStr,  10) || 0;
  const oppScore = parseInt(oppScoreStr, 10) || 0;

  // Convert my scores to challenger/opponent perspective
  const scoreChallenger = myRole === 'challenger' ? myScore : oppScore;
  const scoreOpponent   = myRole === 'challenger' ? oppScore : myScore;
  const myTeamId        = myRole === 'challenger' ? challengerTeamId : opponentTeamId;
  const oppTeamId       = myRole === 'challenger' ? opponentTeamId : challengerTeamId;

  const winnerTeamId = scoreChallenger > scoreOpponent
    ? challengerTeamId
    : scoreOpponent > scoreChallenger
    ? opponentTeamId
    : undefined;

  const winnerLabel = winnerTeamId === myTeamId
    ? myTeamName
    : winnerTeamId === oppTeamId
    ? opponentTeamName
    : undefined;

  // ── Polling ────────────────────────────────────────────────────────────────

  const pollVotes = useCallback(async () => {
    const votes = await getMatchResultVotes(matchId);
    if (votes.length < 2) {return;}

    const cVote = votes.find(v => v.teamRole === 'challenger');
    const oVote = votes.find(v => v.teamRole === 'opponent');
    if (!cVote || !oVote) {return;}

    if (
      cVote.scoreChallenger === oVote.scoreChallenger &&
      cVote.scoreOpponent   === oVote.scoreOpponent
    ) {
      if (pollRef.current) {clearInterval(pollRef.current); pollRef.current = null;}
      try {
        await finalizeMatch(
          matchId,
          cVote.scoreChallenger,
          cVote.scoreOpponent,
          cVote.winnerTeamId ?? challengerTeamId,
          challengerTeamId,
          opponentTeamId,
        );
      } catch { /* trigger handles stats, ignore */ }
      // Navigate to PostMatch for opponent ratings
      navigation.replace('PostMatch', {matchId});
    } else {
      if (pollRef.current) {clearInterval(pollRef.current); pollRef.current = null;}
      const otherRole: 'challenger' | 'opponent' = myRole === 'challenger' ? 'opponent' : 'challenger';
      const otherVote = votes.find(v => v.teamRole === otherRole);
      const otherMy   = myRole === 'challenger' ? otherVote?.scoreChallenger : otherVote?.scoreOpponent;
      const otherOpp  = myRole === 'challenger' ? otherVote?.scoreOpponent : otherVote?.scoreChallenger;
      setDisagreedMsg(`Rakip kaptan: ${myTeamName} ${otherMy ?? '?'} – ${opponentTeamName} ${otherOpp ?? '?'}`);
      setPhase('disagreed');
    }
  }, [matchId, myRole, myTeamName, opponentTeamName, challengerTeamId, opponentTeamId, navigation]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {clearInterval(pollRef.current);}
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (myScore === oppScore) {
      Alert.alert('Beraberlik geçersiz', 'Basketbolda beraberlik olmaz. Skorları kontrol et.');
      return;
    }
    if (!winnerTeamId) {return;}

    setSubmitting(true);
    try {
      await submitMatchResult(matchId, myRole, scoreChallenger, scoreOpponent, winnerTeamId);
      setPhase('waiting');
      // Start polling every 3 seconds
      pollRef.current = setInterval(pollVotes, 3000);
      pollVotes(); // immediate first check
    } catch (e) {
      Alert.alert('Hata', 'Sonuç gönderilemedi. Tekrar dene.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setMyScoreStr('');
    setOppScoreStr('');
    setPhase('input');
  };

  const handleGoHome = () => {
    navigation.navigate('HomeMain');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'waiting') {
    return (
      <View style={rs.screen}>
        <SafeAreaView style={rs.safe}>
          <View style={rs.resultContainer}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={rs.waitingTitle}>Sonucun Gönderildi!</Text>
            <Text style={rs.waitingSubtitle}>
              {myTeamName} {myScore} – {oppScore} {opponentTeamName}
            </Text>
            <Text style={rs.waitingNote}>Rakip kaptanın onayı bekleniyor…</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (phase === 'disagreed') {
    return (
      <View style={rs.screen}>
        <SafeAreaView style={rs.safe}>
          <View style={rs.resultContainer}>
            <Text style={rs.resultEmoji}>⚠️</Text>
            <Text style={rs.resultTitle}>Skorlar Uyuşmuyor</Text>
            <Text style={rs.resultScore}>Senin girdiğin: {myTeamName} {myScore} – {oppScore} {opponentTeamName}</Text>
            <Text style={[rs.resultScore, {marginTop: 4}]}>{disagreedMsg}</Text>
            <Text style={rs.resultNote}>İki kaptan da aynı skoru girmeli.</Text>
            <TouchableOpacity style={rs.retryBtn} onPress={handleRetry} activeOpacity={0.85}>
              <Text style={rs.retryBtnText}>Tekrar Gir</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Input phase
  const myIsWinner  = myScore > oppScore;
  const oppIsWinner = oppScore > myScore;
  const hasValidScores = myScoreStr !== '' && oppScoreStr !== '';

  return (
    <KeyboardAvoidingView style={rs.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={rs.safe}>
        <ScrollView
          contentContainerStyle={rs.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={rs.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Text style={rs.backBtn}>← Geri</Text>
            </TouchableOpacity>
            <Text style={rs.headerTitle}>MAÇ SONUCU</Text>
            <View style={{width: 48}} />
          </View>

          <Text style={rs.subtitle}>Kaptanlar skor konusunda anlaşmalı</Text>

          {/* Score inputs */}
          <View style={rs.scoresRow}>
            <ScoreInput
              label={myTeamName}
              value={myScoreStr}
              onChange={setMyScoreStr}
              isWinner={myIsWinner}
            />
            <View style={rs.vsSep}>
              <Text style={rs.vsSepText}>–</Text>
            </View>
            <ScoreInput
              label={opponentTeamName}
              value={oppScoreStr}
              onChange={setOppScoreStr}
              isWinner={oppIsWinner}
            />
          </View>

          {/* Winner indicator */}
          {winnerLabel ? (
            <View style={rs.winnerRow}>
              <Text style={rs.winnerText}>🏆 Kazanan: {winnerLabel}</Text>
            </View>
          ) : myScore === oppScore && myScore > 0 ? (
            <View style={rs.winnerRow}>
              <Text style={[rs.winnerText, {color: Colors.accentRed}]}>Beraberlik geçersiz!</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[rs.submitBtn, (!hasValidScores || myScore === oppScore || submitting) && rs.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!hasValidScores || myScore === oppScore || submitting}
            activeOpacity={0.85}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={rs.submitBtnText}>Sonucu Gönder</Text>
            }
          </TouchableOpacity>

          <Text style={rs.hint}>
            Rakip kaptan da aynı skoru girdiğinde maç otomatik onaylanır.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const rs = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  scroll: {flexGrow: 1, paddingBottom: Spacing.xxxl},

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  backBtn: {color: Colors.primary, fontSize: Typography.base, fontWeight: Typography.semibold, width: 48},
  headerTitle: {
    fontSize: Typography.sm, fontWeight: Typography.bold,
    color: Colors.textMuted, letterSpacing: 1.2,
  },

  subtitle: {
    textAlign: 'center', color: Colors.textMuted,
    fontSize: Typography.sm, marginBottom: Spacing.xl,
  },

  // Scores
  scoresRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  scoreColumn: {flex: 1, alignItems: 'center', gap: Spacing.sm},
  teamLabel: {
    fontSize: Typography.sm, fontWeight: Typography.bold,
    color: Colors.textSecondary, textAlign: 'center',
  },
  teamLabelWinner: {color: Colors.accentGold},
  scoreCard: {
    backgroundColor: Colors.surface, borderRadius: Radii.xl,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', width: '100%',
    ...Shadows.card,
  },
  scoreCardWinner: {
    borderColor: Colors.accentGold,
    backgroundColor: `${Colors.accentGold}12`,
  },
  scoreInput: {
    fontSize: 56, fontWeight: Typography.black,
    color: Colors.textPrimary, textAlign: 'center',
    width: '100%', paddingVertical: Spacing.lg,
  },
  vsSep: {alignItems: 'center', justifyContent: 'center', paddingTop: 24},
  vsSepText: {fontSize: 28, fontWeight: Typography.black, color: Colors.textMuted},

  // Winner
  winnerRow: {
    alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md,
  },
  winnerText: {fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.accentGold},

  // Submit
  submitBtn: {
    marginHorizontal: Spacing.lg, backgroundColor: Colors.primary,
    borderRadius: Radii.xl, paddingVertical: 16, alignItems: 'center',
    ...Shadows.glow,
  },
  submitBtnDisabled: {opacity: 0.4, shadowOpacity: 0},
  submitBtnText: {fontSize: Typography.base, fontWeight: Typography.bold, color: '#fff'},
  hint: {
    textAlign: 'center', color: Colors.textMuted,
    fontSize: Typography.xs, marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },

  // Result / waiting screens
  resultContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, gap: Spacing.md,
  },
  resultEmoji: {fontSize: 64},
  resultTitle: {fontSize: Typography.xl, fontWeight: Typography.heavy, color: Colors.textPrimary},
  resultWinner: {fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.accentGold},
  resultScore: {fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center'},
  resultNote: {fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center'},
  homeBtn: {
    marginTop: Spacing.lg, backgroundColor: Colors.primary,
    borderRadius: Radii.xl, paddingVertical: 14, paddingHorizontal: Spacing.xxxl,
  },
  homeBtnText: {fontSize: Typography.base, fontWeight: Typography.bold, color: '#fff'},
  retryBtn: {
    marginTop: Spacing.lg, backgroundColor: Colors.surface,
    borderRadius: Radii.xl, paddingVertical: 14, paddingHorizontal: Spacing.xxxl,
    borderWidth: 1, borderColor: Colors.border,
  },
  retryBtnText: {fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary},
  waitingTitle: {fontSize: Typography.xl, fontWeight: Typography.heavy, color: Colors.textPrimary, marginTop: Spacing.lg},
  waitingSubtitle: {fontSize: Typography.base, color: Colors.primary, fontWeight: Typography.bold},
  waitingNote: {fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center'},
});

export default MatchResultsScreen;
