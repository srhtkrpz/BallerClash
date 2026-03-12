import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors, Typography, Spacing, Radii, Shadows} from '../../constants/theme';
import type {Match, City} from '../../types/models';
import type {HomeStackParamList} from '../../navigation/AppNavigator';
import {
  getOpenMatches,
  getMyMatches,
  confirmMatch,
  deleteMatch,
} from '../../services/supabase/matchesService';
import {getMyTeam} from '../../services/supabase/teamsService';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;

// ── Featured court ────────────────────────────────────────────────────────────

const KOBE_COURT = {
  id: 'kobe-caddebostan',
  name: 'Caddebostan Kobe Sahası',
  city: 'istanbul',
  address: 'Caddebostan, Operatör Cemil Topuzlu Cd. 132 B, 34728 Kadıköy/İstanbul',
};

const CourtCard = ({onPress}: {onPress: () => void}) => (
  <TouchableOpacity style={s.courtCard} onPress={onPress} activeOpacity={0.88}>
    <Image
      source={require('../../../assets/courts/kobe.png')}
      style={s.courtCardImg}
      resizeMode="cover"
    />
    <View style={s.courtCardOverlay}>
      <View style={s.courtCardBottom}>
        <View style={s.courtCardLeft}>
          <Text style={s.courtCardName}>{KOBE_COURT.name}</Text>
        </View>
        <View style={s.courtCardCta}>
          <Text style={s.courtCardCtaText}>＋ Maç Oluştur</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

const CITY_FILTERS: {key: City | 'all'; label: string}[] = [
  {key: 'all', label: 'Tümü'},
  {key: 'istanbul', label: 'İstanbul'},
  {key: 'ankara', label: 'Ankara'},
  {key: 'izmir', label: 'İzmir'},
];

const STATUS_COLOR: Record<string, string> = {
  open: Colors.accentGreen,
  pending: Colors.warning,
  confirmed: Colors.accentBlue,
  in_progress: Colors.accentRed,
  completed: Colors.textMuted,
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Rakip Aranıyor',
  pending: 'Yanıt Bekleniyor',
  confirmed: 'Onaylandı',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
};

// ── MatchCard ────────────────────────────────────────────────────────────────

const MatchCard = ({match, onPress}: {match: Match; onPress: () => void}) => {
  const date = new Date(match.scheduledAt).toLocaleDateString('tr-TR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.badge, {backgroundColor: `${STATUS_COLOR[match.status]}20`}]}>
        <View style={[s.badgeDot, {backgroundColor: STATUS_COLOR[match.status]}]} />
        <Text style={[s.badgeText, {color: STATUS_COLOR[match.status]}]}>
          {STATUS_LABEL[match.status]}
        </Text>
      </View>

      <View style={s.teamsRow}>
        <View style={s.teamSide}>
          <Text style={s.teamName} numberOfLines={1}>{match.challengerTeamName}</Text>
          <Text style={s.teamLabel}>Meydan Okuyan</Text>
        </View>
        <View style={s.vsBox}>
          <Text style={s.vs}>VS</Text>
        </View>
        <View style={[s.teamSide, {alignItems: 'flex-end'}]}>
          <Text style={s.teamName} numberOfLines={1}>
            {match.opponentTeamName ?? '?'}
          </Text>
          <Text style={s.teamLabel}>Rakip</Text>
        </View>
      </View>

      <View style={s.cardFooter}>
        <Text style={s.courtName}>📍 {match.courtName}</Text>
        <Text style={s.matchDate}>{date}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ── PendingCard ──────────────────────────────────────────────────────────────

const PendingCard = ({
  match,
  myTeamId,
  onAccept,
  onReject,
  onPress,
}: {
  match: Match;
  myTeamId: string;
  onAccept: () => void;
  onReject: () => void;
  onPress: () => void;
}) => {
  const date = new Date(match.scheduledAt).toLocaleDateString('tr-TR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const isMine = match.challengerTeamId === myTeamId;
  const challengerName = isMine ? (match.opponentTeamName ?? '?') : match.challengerTeamName;
  const challengeLabel = isMine ? 'Gelen Meydan Okuma' : 'Maçım için meydan okuma bekleniyor';

  return (
    <TouchableOpacity style={s.pendingCard} onPress={onPress} activeOpacity={0.85}>
      <View style={s.pendingTop}>
        <View style={[s.badge, {backgroundColor: `${Colors.warning}20`}]}>
          <View style={[s.badgeDot, {backgroundColor: Colors.warning}]} />
          <Text style={[s.badgeText, {color: Colors.warning}]}>Yanıt Bekleniyor</Text>
        </View>
      </View>

      {isMine ? (
        <Text style={s.pendingChallenger}>
          <Text style={s.pendingBold}>{challengerName}</Text>
          {' '}sana meydan okudu
        </Text>
      ) : (
        <Text style={s.pendingChallenger}>{challengeLabel}</Text>
      )}

      <View style={s.cardFooter}>
        <Text style={s.courtName}>📍 {match.courtName}</Text>
        <Text style={s.matchDate}>{date}</Text>
      </View>

      {isMine && (
        <View style={s.pendingActions}>
          <TouchableOpacity style={s.rejectBtn} onPress={onReject} activeOpacity={0.8}>
            <Text style={s.rejectBtnText}>Reddet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.acceptBtn} onPress={onAccept} activeOpacity={0.8}>
            <Text style={s.acceptBtnText}>Kabul Et 🤝</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ── HomeScreen ───────────────────────────────────────────────────────────────

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const [activeTab, setActiveTab] = useState<'matches' | 'invitations' | 'mymatches'>('matches');
  const [matches, setMatches] = useState<Match[]>([]);
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cityFilter, setCityFilter] = useState<City | 'all'>('all');
  const [myTeamId, setMyTeamId] = useState<string>('');

  const loadData = useCallback(async () => {
    const city = cityFilter === 'all' ? undefined : cityFilter;
    const [open, mine, team] = await Promise.all([
      getOpenMatches(city),
      getMyMatches(),
      getMyTeam(),
    ]);
    setMatches(open);
    setMyMatches(mine);
    setMyTeamId(team?.id ?? '');
    setLoading(false);
    setRefreshing(false);
  }, [cityFilter]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadData();
  }, [loadData]));

  const handleCityFilter = (key: City | 'all') => {
    setCityFilter(key);
    setLoading(true);
  };

  const handleAccept = async (matchId: string) => {
    try {
      await confirmMatch(matchId);
      navigation.navigate('MatchLobby', {matchId});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Hata oluştu';
      Alert.alert('Hata', msg);
    }
  };

  const handleReject = async (matchId: string) => {
    Alert.alert(
      'Meydan Okumayı Reddet',
      'Bu meydan okumayı reddetmek istediğine emin misin?',
      [
        {text: 'Vazgeç', style: 'cancel'},
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMatch(matchId);
              loadData();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Hata oluştu';
              Alert.alert('Hata', msg);
            }
          },
        },
      ],
    );
  };

  // For the Davetler tab: pending matches where my team is challenger (I received a challenge)
  // and all my open matches waiting for challengers
  const pendingIncoming = myMatches.filter(
    m => m.status === 'pending' && m.challengerTeamId === myTeamId,
  );
  const myOpenMatches = myMatches.filter(
    m => m.status === 'open' && m.challengerTeamId === myTeamId,
  );
  const pendingOutgoing = myMatches.filter(
    m => m.status === 'pending' && m.opponentTeamId === myTeamId,
  );
  const myActiveMatches = myMatches.filter(
    m => (m.status === 'confirmed' || m.status === 'in_progress') &&
         (m.challengerTeamId === myTeamId || m.opponentTeamId === myTeamId),
  );

  // Maçlar tabı sadece açık maçları gösterir (onaylananlar genel listeden kalkar)
  const filtered = (cityFilter === 'all' ? matches : matches.filter(m => m.city === cityFilter))
    .filter(m => m.status === 'open');

  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Maçlar</Text>
          <TouchableOpacity
            style={s.createBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('CreateMatch')}>
            <Text style={s.createBtnText}>+ Maç Oluştur</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'matches' && s.tabActive]}
            onPress={() => setActiveTab('matches')}
            activeOpacity={0.8}>
            <Text style={[s.tabText, activeTab === 'matches' && s.tabTextActive]}>Maçlar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'invitations' && s.tabActive]}
            onPress={() => setActiveTab('invitations')}
            activeOpacity={0.8}>
            <Text style={[s.tabText, activeTab === 'invitations' && s.tabTextActive]}>Davetler</Text>
            {(pendingIncoming.length + pendingOutgoing.length) > 0 && (
              <View style={s.tabBadge}>
                <Text style={s.tabBadgeText}>{pendingIncoming.length + pendingOutgoing.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'mymatches' && s.tabActive]}
            onPress={() => setActiveTab('mymatches')}
            activeOpacity={0.8}>
            <Text style={[s.tabText, activeTab === 'mymatches' && s.tabTextActive]}>Maçlarım</Text>
            {myActiveMatches.length > 0 && (
              <View style={s.tabBadge}>
                <Text style={s.tabBadgeText}>{myActiveMatches.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <>
            {/* Featured court card */}
            <View style={s.courtCardWrapper}>
              <CourtCard
                onPress={() => navigation.navigate('CreateMatch', {preselectedCourt: KOBE_COURT})}
              />
            </View>

            <View style={s.filterRow}>
              {CITY_FILTERS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[s.filterChip, cityFilter === f.key && s.filterChipActive]}
                  onPress={() => handleCityFilter(f.key)}
                  activeOpacity={0.8}>
                  <Text style={[s.filterText, cityFilter === f.key && s.filterTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading ? (
              <View style={s.center}>
                <ActivityIndicator color={Colors.primary} size="large" />
              </View>
            ) : filtered.length === 0 ? (
              <View style={s.center}>
                <Text style={s.emptyIcon}>🏀</Text>
                <Text style={s.emptyTitle}>Henüz maç yok</Text>
                <Text style={s.emptySub}>İlk maçı oluştur ve sahaya çık!</Text>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={m => m.id}
                contentContainerStyle={s.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {setRefreshing(true); loadData();}}
                    tintColor={Colors.primary}
                  />
                }
                renderItem={({item}) => (
                  <MatchCard
                    match={item}
                    onPress={() => navigation.navigate('MatchDetail', {matchId: item.id})}
                  />
                )}
              />
            )}
          </>
        )}

        {/* Maçlarım Tab */}
        {activeTab === 'mymatches' && (
          <>
            {loading ? (
              <View style={s.center}>
                <ActivityIndicator color={Colors.primary} size="large" />
              </View>
            ) : myActiveMatches.length === 0 ? (
              <View style={s.center}>
                <Text style={s.emptyIcon}>🏀</Text>
                <Text style={s.emptyTitle}>Aktif maç yok</Text>
                <Text style={s.emptySub}>Onaylanan maçların burada görünür.</Text>
              </View>
            ) : (
              <FlatList
                data={myActiveMatches}
                keyExtractor={m => m.id}
                contentContainerStyle={s.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {setRefreshing(true); loadData();}}
                    tintColor={Colors.primary}
                  />
                }
                renderItem={({item}) => (
                  <MatchCard
                    match={item}
                    onPress={() => navigation.navigate('MatchDetail', {matchId: item.id})}
                  />
                )}
              />
            )}
          </>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <>
            {loading ? (
              <View style={s.center}>
                <ActivityIndicator color={Colors.primary} size="large" />
              </View>
            ) : (
              <FlatList
                data={[
                  {type: 'section', label: 'Gelen Meydan Okumalar', key: 'sec-incoming'},
                  ...pendingIncoming.map(m => ({type: 'pending', match: m, key: m.id})),
                  pendingIncoming.length === 0
                    ? {type: 'empty', label: 'Bekleyen meydan okuma yok', key: 'empty-incoming'}
                    : null,
                  {type: 'section', label: 'Gönderilen Meydan Okumalar', key: 'sec-outgoing'},
                  ...myOpenMatches.map(m => ({type: 'myopen', match: m, key: `myopen-${m.id}`})),
                  ...pendingOutgoing.map(m => ({type: 'mypending', match: m, key: `mypending-${m.id}`})),
                  (myOpenMatches.length + pendingOutgoing.length) === 0
                    ? {type: 'empty', label: 'Gönderilen meydan okuma yok', key: 'empty-outgoing'}
                    : null,
                ].filter(Boolean) as Array<{type: string; label?: string; match?: Match; key: string}>}
                keyExtractor={item => item.key}
                contentContainerStyle={s.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {setRefreshing(true); loadData();}}
                    tintColor={Colors.primary}
                  />
                }
                renderItem={({item}) => {
                  if (item.type === 'section') {
                    return <Text style={s.sectionHeader}>{item.label}</Text>;
                  }
                  if (item.type === 'empty') {
                    return (
                      <View style={s.inlineEmpty}>
                        <Text style={s.inlineEmptyText}>{item.label}</Text>
                      </View>
                    );
                  }
                  if ((item.type === 'pending' || item.type === 'myopen' || item.type === 'mypending') && item.match) {
                    return (
                      <PendingCard
                        match={item.match}
                        myTeamId={myTeamId}
                        onAccept={() => handleAccept(item.match!.id)}
                        onReject={() => handleReject(item.match!.id)}
                        onPress={() => navigation.navigate('MatchDetail', {matchId: item.match!.id})}
                      />
                    );
                  }
                  return null;
                }}
              />
            )}
          </>
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

  // Tabs
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  tab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: {borderBottomColor: Colors.primary},
  tabText: {fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textMuted},
  tabTextActive: {color: Colors.primary},
  tabBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {color: '#fff', fontSize: 10, fontWeight: Typography.bold},

  // Filter
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {backgroundColor: Colors.primarySubtle, borderColor: Colors.primary},
  filterText: {fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textMuted},
  filterTextActive: {color: Colors.primary},

  list: {paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: Spacing.xl},
  emptyIcon: {fontSize: 48},
  emptyTitle: {fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary},
  emptySub: {fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center'},

  // Section header
  sectionHeader: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  inlineEmpty: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  inlineEmptyText: {fontSize: Typography.sm, color: Colors.textMuted},

  // MatchCard
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.card,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  badgeDot: {width: 6, height: 6, borderRadius: 3},
  badgeText: {fontSize: Typography.xs, fontWeight: Typography.bold},
  teamsRow: {flexDirection: 'row', alignItems: 'center'},
  teamSide: {flex: 1},
  teamName: {fontSize: Typography.base, fontWeight: Typography.heavy, color: Colors.textPrimary},
  teamLabel: {fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2},
  vsBox: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radii.md,
    marginHorizontal: Spacing.sm,
  },
  vs: {fontSize: Typography.xs, fontWeight: Typography.black, color: Colors.primary},
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  courtName: {fontSize: Typography.xs, color: Colors.textMuted},
  matchDate: {fontSize: Typography.xs, color: Colors.textMuted},

  // PendingCard
  pendingCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: `${Colors.warning}40`,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.card,
  },
  pendingTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  pendingChallenger: {fontSize: Typography.base, color: Colors.textSecondary},
  pendingBold: {fontWeight: Typography.bold, color: Colors.textPrimary},
  pendingActions: {flexDirection: 'row', gap: Spacing.sm},
  rejectBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
  },
  rejectBtnText: {color: Colors.textSecondary, fontSize: Typography.sm, fontWeight: Typography.semibold},
  acceptBtn: {
    flex: 2,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    backgroundColor: Colors.accentGreen,
    alignItems: 'center',
  },
  acceptBtnText: {color: '#fff', fontSize: Typography.sm, fontWeight: Typography.bold},

  // Court card
  courtCardWrapper: {paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs},
  courtCard: {
    borderRadius: Radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    height: 200,
    ...Shadows.card,
  },
  courtCardImg: {width: '100%', height: '100%', position: 'absolute'},
  courtCardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  courtCardBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.30)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  courtCardLeft: {gap: 3, flex: 1},
  courtCardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.primary}cc`,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  courtCardBadgeText: {fontSize: Typography.xs, fontWeight: Typography.bold, color: '#fff'},
  courtCardName: {fontSize: Typography.base, fontWeight: Typography.black, color: '#fff'},
  courtCardAddr: {fontSize: Typography.xs, color: 'rgba(255,255,255,0.75)'},
  courtCardCta: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  courtCardCtaText: {fontSize: Typography.xs, fontWeight: Typography.bold, color: '#fff'},
});

export default HomeScreen;
