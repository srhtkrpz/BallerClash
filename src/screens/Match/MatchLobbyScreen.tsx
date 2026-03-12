import React, {useState, useCallback, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp, NativeStackScreenProps} from '@react-navigation/native-stack';
import {Colors, Typography, Spacing, Radii} from '../../constants/theme';
import type {Match, TeamMember, AvatarConfig, HairStyle} from '../../types/models';
import type {HomeStackParamList} from '../../navigation/AppNavigator';
import {getMatchById, voteStartMatch, rowToMatch} from '../../services/supabase/matchesService';
import {getTeamMembers} from '../../services/supabase/teamsService';
import {getSession, supabase} from '../../services/supabase/client';
import BasketbolcuAvatar, {type AvatarColors} from '../../components/BasketbolcuAvatar';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'MatchLobby'>;
type RouteProp = NativeStackScreenProps<HomeStackParamList, 'MatchLobby'>['route'];

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');
const AVATAR_SIZE = Math.min(72, Math.floor(SCREEN_W / 5.5));
const MATCH_DURATION_SECS = 30 * 60; // 30 minutes

const DEFAULT_AVATAR: AvatarColors = {
  skin: '#F1C27D',
  hairColor: '#111111',
  hairStyle: 'short',
  eyeColor: '#3a2a1a',
  jerseyColor: '#f97316',
  jerseyNumber: 23,
  shortsColor: '#111111',
  shoesColor: '#111111',
};

function toAvatarColors(cfg?: AvatarConfig): AvatarColors {
  if (!cfg) {return DEFAULT_AVATAR;}
  return {
    skin:         cfg.skin        ?? DEFAULT_AVATAR.skin,
    hairColor:    cfg.hairColor   ?? DEFAULT_AVATAR.hairColor,
    hairStyle:    (cfg.hairStyle  ?? DEFAULT_AVATAR.hairStyle) as HairStyle,
    eyeColor:     cfg.eyeColor    ?? DEFAULT_AVATAR.eyeColor,
    jerseyColor:  cfg.jerseyColor ?? DEFAULT_AVATAR.jerseyColor,
    jerseyNumber: cfg.jerseyNumber ?? DEFAULT_AVATAR.jerseyNumber,
    shortsColor:  cfg.shorts      ?? DEFAULT_AVATAR.shortsColor,
    shoesColor:   cfg.shoes       ?? DEFAULT_AVATAR.shoesColor,
  };
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Player slot ───────────────────────────────────────────────────────────────

const AVATAR_SVG_SIZE = Math.round(AVATAR_SIZE * 2.10);

const PlayerSlot = ({member}: {member: TeamMember; flipped?: boolean}) => (
  <View style={ls.playerSlot}>
    <View style={ls.avatarWrapper}>
      {member.role === 'captain' && (
        <Text style={ls.captainCrown}>👑</Text>
      )}
      <View style={ls.avatarCircle}>
        <View style={ls.avatarCrop}>
          <BasketbolcuAvatar colors={toAvatarColors(member.avatarConfig)} size={AVATAR_SVG_SIZE} />
        </View>
      </View>
    </View>
    <View style={ls.playerNameTag}>
      <Text style={ls.playerName} numberOfLines={1}>{member.username}</Text>
    </View>
  </View>
);

// ── MatchLobbyScreen ──────────────────────────────────────────────────────────

const MatchLobbyScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp>();
  const {matchId} = route.params;

  const [match, setMatch] = useState<Match | null>(null);
  const [challengerMembers, setChallengerMembers] = useState<TeamMember[]>([]);
  const [opponentMembers, setOpponentMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Captain state
  const [amICaptain, setAmICaptain] = useState(false);
  const [myRole, setMyRole] = useState<'challenger' | 'opponent' | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [votingStart, setVotingStart] = useState(false);
  const [iVoted, setIVoted] = useState(false);

  // Timer
  const [timerSecs, setTimerSecs] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const startTimer = useCallback((startedAt: string) => {
    if (timerRef.current) {return;} // already running
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const remaining = Math.max(0, MATCH_DURATION_SECS - elapsed);
    setTimerSecs(remaining);
    timerRef.current = setInterval(() => {
      setTimerSecs(prev => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) {clearInterval(timerRef.current); timerRef.current = null;}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const applyMatch = useCallback((m: Match) => {
    setMatch(m);
    if (m.status === 'in_progress' && m.matchStartedAt) {
      startTimer(m.matchStartedAt);
    }
  }, [startTimer]);

  // ── Load data ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const session = await getSession();
    if (!session) {setLoading(false); return;}
    const myId = session.user.id;

    const fetchedMatch = await getMatchById(matchId);
    if (!fetchedMatch) {setLoading(false); return;}
    applyMatch(fetchedMatch);

    const [cMembers, oMembers] = await Promise.all([
      getTeamMembers(fetchedMatch.challengerTeamId),
      fetchedMatch.opponentTeamId ? getTeamMembers(fetchedMatch.opponentTeamId) : Promise.resolve([]),
    ]);
    setChallengerMembers(cMembers);
    setOpponentMembers(oMembers);

    // Determine if I am a captain
    const cCaptain = cMembers.find(m => m.role === 'captain');
    const oCaptain = oMembers.find(m => m.role === 'captain');

    if (cCaptain?.userId === myId) {
      setAmICaptain(true);
      setMyRole('challenger');
      setMyTeamId(fetchedMatch.challengerTeamId);
      setIVoted(fetchedMatch.startVoteChallenger);
    } else if (oCaptain?.userId === myId) {
      setAmICaptain(true);
      setMyRole('opponent');
      setMyTeamId(fetchedMatch.opponentTeamId ?? null);
      setIVoted(fetchedMatch.startVoteOpponent);
    }

    setLoading(false);
  }, [matchId, applyMatch]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadData();
  }, [loadData]));

  // ── Realtime subscription ─────────────────────────────────────────────────

  useEffect(() => {
    channelRef.current = supabase
      .channel(`match-lobby-${matchId}`)
      .on(
        'postgres_changes',
        {event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}`},
        async (payload) => {
          const updated = rowToMatch(payload.new as any);
          applyMatch(updated);
          // Sync captain's own vote state
          if (myRole === 'challenger') {setIVoted(updated.startVoteChallenger);}
          if (myRole === 'opponent')   {setIVoted(updated.startVoteOpponent);}
        },
      )
      .subscribe();

    return () => {
      if (channelRef.current) {supabase.removeChannel(channelRef.current);}
      if (timerRef.current)   {clearInterval(timerRef.current);}
    };
  }, [matchId, myRole, applyMatch]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStartVote = async () => {
    if (!myRole || iVoted) {return;}
    setVotingStart(true);
    try {
      const updated = await voteStartMatch(matchId, myRole);
      if (updated) {applyMatch(updated);}
      setIVoted(true);
    } catch (e) {
      Alert.alert('Hata', 'Maç başlatılamadı. Tekrar dene.');
    } finally {
      setVotingStart(false);
    }
  };

  const handleEndMatch = () => {
    if (!match) {return;}
    navigation.navigate('MatchResults', {
      matchId,
      myRole: myRole!,
      myTeamName:       myRole === 'challenger' ? match.challengerTeamName : (match.opponentTeamName ?? 'Takım'),
      opponentTeamName: myRole === 'challenger' ? (match.opponentTeamName ?? 'Rakip') : match.challengerTeamName,
      challengerTeamId: match.challengerTeamId,
      opponentTeamId:   match.opponentTeamId!,
    });
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderVoteBadge = () => {
    if (!match || match.status !== 'confirmed') {return null;}
    const cVoted = match.startVoteChallenger;
    const oVoted = match.startVoteOpponent;
    return (
      <View style={ls.voteBadgeRow}>
        <View style={[ls.voteBadge, cVoted && ls.voteBadgeActive]}>
          <Text style={ls.voteBadgeText}>{cVoted ? '✓' : '⏳'} {match.challengerTeamName}</Text>
        </View>
        <View style={[ls.voteBadge, oVoted && ls.voteBadgeActive]}>
          <Text style={ls.voteBadgeText}>{oVoted ? '✓' : '⏳'} {match.opponentTeamName ?? 'Rakip'}</Text>
        </View>
      </View>
    );
  };

  const renderCaptainBar = () => {
    if (!amICaptain || !match) {return null;}

    // In progress → "End Match" button
    if (match.status === 'in_progress') {
      return (
        <TouchableOpacity style={ls.endBtn} onPress={handleEndMatch} activeOpacity={0.85}>
          <Text style={ls.endBtnText}>🏁  Maçı Bitir</Text>
        </TouchableOpacity>
      );
    }

    // Confirmed → "Start Match" vote button
    if (match.status === 'confirmed') {
      const alreadyVoted = myRole === 'challenger' ? match.startVoteChallenger : match.startVoteOpponent;
      return (
        <TouchableOpacity
          style={[ls.startBtn, alreadyVoted && ls.startBtnDone]}
          onPress={handleStartVote}
          disabled={alreadyVoted || votingStart}
          activeOpacity={0.85}>
          {votingStart
            ? <ActivityIndicator color="#fff" />
            : <Text style={ls.startBtnText}>{alreadyVoted ? '✓  Başlatma Oyunun Verildi' : '▶  Maçı Başlat'}</Text>
          }
        </TouchableOpacity>
      );
    }

    return null;
  };

  // ── Early states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={ls.screen}>
        <ActivityIndicator color={Colors.primary} size="large" style={{flex: 1}} />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={ls.screen}>
        <SafeAreaView style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{color: Colors.textMuted}}>Maç bulunamadı.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{color: Colors.primary, marginTop: 12}}>← Geri</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const scheduledDate = new Date(match.scheduledAt);
  const formattedDate = scheduledDate.toLocaleDateString('tr-TR', {weekday: 'short', day: 'numeric', month: 'short'});
  const formattedTime = scheduledDate.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});

  const renderPlayers = (members: TeamMember[], flipped?: boolean) => {
    const slots = Array.from({length: 4}, (_, i) => members[i] ?? null);
    return (
      <View style={ls.playersRow}>
        {slots.map((member, i) =>
          member ? (
            <PlayerSlot key={member.userId} member={member} flipped={flipped} />
          ) : (
            <View key={`empty-${i}`} style={ls.emptySlot}>
              <View style={ls.emptyAvatarCircle}>
                <Text style={ls.emptyAvatarText}>?</Text>
              </View>
              <View style={ls.playerNameTag}>
                <Text style={ls.playerNameEmpty}>Bekleniyor</Text>
              </View>
            </View>
          ),
        )}
      </View>
    );
  };

  return (
    <View style={ls.screen}>
      {/* Court background */}
      <Image
        source={require('../../../assets/courts/kobe-lobby.jpg')}
        style={ls.courtBg}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFill, ls.overlay]} />

      <SafeAreaView style={ls.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={ls.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <Text style={ls.backBtn}>← Geri</Text>
          </TouchableOpacity>
          <View style={ls.headerCenter}>
            {match.status === 'in_progress' && timerSecs !== null ? (
              <View style={ls.timerPill}>
                <Text style={ls.timerText}>⏱ {formatTimer(timerSecs)}</Text>
              </View>
            ) : (
              <View style={ls.confirmedPill}>
                <View style={ls.confirmedDot} />
                <Text style={ls.confirmedText}>ONAYLANDI</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('MatchDetail', {matchId})}
            hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <Text style={ls.detailBtn}>Detay →</Text>
          </TouchableOpacity>
        </View>

        {/* CHALLENGER TEAM — top half */}
        <View style={ls.teamHalf}>
          <View style={ls.teamNameBadge}>
            <Text style={ls.teamNameText}>{match.challengerTeamName}</Text>
          </View>
          {renderPlayers(challengerMembers)}
        </View>

        {/* VS CENTER DIVIDER */}
        <View style={ls.vsDivider}>
          <View style={ls.dividerLine} />
          <View style={ls.vsCircle}>
            <Text style={ls.vsText}>VS</Text>
          </View>
          <View style={ls.dividerLine} />
        </View>

        {/* OPPONENT TEAM — bottom half */}
        <View style={[ls.teamHalf, ls.teamHalfBottom]}>
          {renderPlayers(opponentMembers, true)}
          <View style={ls.teamNameBadge}>
            <Text style={ls.teamNameText}>{match.opponentTeamName ?? 'Rakip'}</Text>
          </View>
        </View>

        {/* Captain action bar */}
        <View style={ls.captainBar}>
          {renderCaptainBar()}
        </View>

        {/* Footer */}
        <View style={ls.footer}>
          <Text style={ls.footerCourt}>📍 {match.courtName}</Text>
          <Text style={ls.footerDate}>{formattedDate} · {formattedTime}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

const ls = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#1a3a1a'},
  courtBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    width: SCREEN_W, height: SCREEN_H,
  },
  overlay: {backgroundColor: 'rgba(0,0,0,0.45)'},
  safe: {flex: 1},

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 4,
  },
  backBtn: {color: Colors.primary, fontSize: Typography.base, fontWeight: Typography.semibold},
  detailBtn: {color: Colors.textMuted, fontSize: Typography.sm},
  headerCenter: {alignItems: 'center'},
  confirmedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: `${Colors.accentGreen}25`,
    borderWidth: 1, borderColor: `${Colors.accentGreen}50`,
    borderRadius: Radii.full, paddingHorizontal: Spacing.md, paddingVertical: 5,
  },
  confirmedDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accentGreen},
  confirmedText: {fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.accentGreen, letterSpacing: 0.8},
  timerPill: {
    backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 1,
    borderColor: `${Colors.primary}60`, borderRadius: Radii.full,
    paddingHorizontal: Spacing.xl, paddingVertical: 8,
  },
  timerText: {fontSize: Typography.xl, fontWeight: Typography.black, color: Colors.primary, letterSpacing: 2},

  // Team halves
  teamHalf: {
    flex: 2.3, alignItems: 'center', justifyContent: 'flex-end',
    paddingBottom: Spacing.xxxl, gap: Spacing.sm, paddingHorizontal: Spacing.sm,
  },
  teamHalfBottom: {flex: 1.2, justifyContent: 'flex-start', paddingTop: Spacing.xxxl},
  teamNameBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radii.full,
    borderWidth: 1, borderColor: Colors.borderStrong,
    paddingHorizontal: Spacing.lg, paddingVertical: 6,
  },
  teamNameText: {
    fontSize: Typography.base, fontWeight: Typography.black,
    color: Colors.textPrimary, letterSpacing: 0.5,
  },

  // Players
  playersRow: {flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'nowrap'},
  playerSlot: {alignItems: 'center', width: AVATAR_SIZE + 8, gap: 4},
  avatarWrapper: {alignItems: 'center'},
  captainCrown: {
    position: 'absolute', top: -10, fontSize: 14, zIndex: 10,
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000', shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.8, shadowRadius: 6, elevation: 8,
  },
  avatarCrop: {
    position: 'absolute',
    top: -Math.round(AVATAR_SIZE * 0.20),
    left: Math.round((AVATAR_SIZE - AVATAR_SVG_SIZE) / 2) + 21,
  },
  playerNameTag: {
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: Radii.sm,
    paddingHorizontal: 5, paddingVertical: 2, maxWidth: AVATAR_SIZE + 8,
  },
  playerName: {fontSize: 10, fontWeight: Typography.bold, color: '#fff', textAlign: 'center'},
  emptySlot: {alignItems: 'center', width: AVATAR_SIZE + 8, gap: 4},
  emptyAvatarCircle: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyAvatarText: {fontSize: 22, color: 'rgba(255,255,255,0.25)'},
  playerNameEmpty: {fontSize: 9, color: Colors.textMuted, textAlign: 'center'},

  // VS Divider
  vsDivider: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.md},
  dividerLine: {flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)'},
  vsCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.7, shadowRadius: 12, elevation: 8,
  },
  vsText: {fontSize: Typography.base, fontWeight: Typography.black, color: '#fff'},

  // Vote badges
  voteBadgeRow: {flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, paddingBottom: 6},
  voteBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: Radii.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  voteBadgeActive: {borderColor: `${Colors.accentGreen}80`, backgroundColor: `${Colors.accentGreen}15`},
  voteBadgeText: {fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.semibold},

  // Captain action bar
  captainBar: {paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm},
  startBtn: {
    backgroundColor: Colors.primary, borderRadius: Radii.xl,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  startBtnDone: {backgroundColor: Colors.accentGreen, shadowColor: Colors.accentGreen},
  startBtnText: {fontSize: Typography.base, fontWeight: Typography.bold, color: '#fff'},
  endBtn: {
    backgroundColor: Colors.accentRed, borderRadius: Radii.xl,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: Colors.accentRed, shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  endBtnText: {fontSize: Typography.base, fontWeight: Typography.bold, color: '#fff'},

  // Footer
  footer: {
    alignItems: 'center', paddingVertical: 6, gap: 2,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  footerCourt: {fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary},
  footerDate: {fontSize: Typography.xs, color: Colors.textMuted},
});

export default MatchLobbyScreen;
