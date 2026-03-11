import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radii, Shadows} from '../../constants/theme';
import type {City, LeaderboardEntry} from '../../types/models';
import {getLeaderboard} from '../../services/supabase/leaderboardService';

const CITY_TABS: {key: City | 'all'; label: string}[] = [
  {key: 'all', label: 'Türkiye'},
  {key: 'istanbul', label: 'İstanbul'},
  {key: 'ankara', label: 'Ankara'},
  {key: 'izmir', label: 'İzmir'},
];

const RankBadge = ({rank}: {rank: number}) => {
  if (rank <= 3) {
    const medals = ['🥇', '🥈', '🥉'];
    return <Text style={lb.medal}>{medals[rank - 1]}</Text>;
  }
  return <Text style={lb.rankNum}>#{rank}</Text>;
};

const RatingBar = ({rating}: {rating: number}) => {
  const getRatingColor = (r: number) => {
    if (r >= 8.5) {return Colors.ratingElite;}
    if (r >= 7.0) {return Colors.ratingGood;}
    if (r >= 5.5) {return Colors.ratingAvg;}
    return Colors.ratingLow;
  };
  return (
    <View style={lb.ratingRow}>
      <Text style={[lb.ratingValue, {color: getRatingColor(rating)}]}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
};

const LeaderboardScreen: React.FC = () => {
  const [cityTab, setCityTab] = useState<City | 'all'>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async (tab: City | 'all') => {
    setLoading(true);
    const city = tab === 'all' ? undefined : tab;
    const data = await getLeaderboard(city);
    setEntries(data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadEntries(cityTab);
  }, [cityTab, loadEntries]);

  const handleTabChange = (tab: City | 'all') => {
    setCityTab(tab);
  };

  return (
    <View style={lb.screen}>
      <SafeAreaView style={lb.safe} edges={['top']}>
        {/* Header */}
        <View style={lb.header}>
          <Text style={lb.title}>Sıralama 🏆</Text>
        </View>

        {/* City tabs */}
        <View style={lb.tabs}>
          {CITY_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[lb.tab, cityTab === tab.key && lb.tabActive]}
              onPress={() => handleTabChange(tab.key)}
              activeOpacity={0.8}>
              <Text style={[lb.tabText, cityTab === tab.key && lb.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={lb.center}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : entries.length === 0 ? (
          <View style={lb.center}>
            <Text style={lb.emptyIcon}>🏆</Text>
            <Text style={lb.emptyTitle}>Sıralama henüz boş</Text>
            <Text style={lb.emptySub}>Maç kazan, zirvede yerini al!</Text>
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={e => e.userId}
            contentContainerStyle={lb.list}
            showsVerticalScrollIndicator={false}
            renderItem={({item, index}) => (
              <View style={[lb.row, index < 3 && lb.rowTop]}>
                <View style={lb.rankCol}>
                  <RankBadge rank={item.rank} />
                </View>
                <View style={lb.info}>
                  <Text style={lb.username}>{item.username}</Text>
                  <Text style={lb.meta}>{item.totalMatches} maç · {item.wins} galibiyet</Text>
                </View>
                <RatingBar rating={item.avgRating} />
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const lb = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  header: {paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm},
  title: {fontSize: Typography.xxl, fontWeight: Typography.black, color: Colors.textPrimary, letterSpacing: -0.5},
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
    gap: 2,
  },
  tab: {flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: Radii.md},
  tabActive: {backgroundColor: Colors.primary},
  tabText: {fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textMuted},
  tabTextActive: {color: '#fff'},
  list: {paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: 2},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  rowTop: {borderWidth: 1, borderColor: Colors.border, ...Shadows.card},
  rankCol: {width: 36, alignItems: 'center'},
  medal: {fontSize: 22},
  rankNum: {fontSize: Typography.sm, fontWeight: Typography.heavy, color: Colors.textMuted},
  info: {flex: 1},
  username: {fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary},
  meta: {fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2},
  ratingRow: {alignItems: 'flex-end'},
  ratingValue: {fontSize: Typography.xl, fontWeight: Typography.black},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12},
  emptyIcon: {fontSize: 48},
  emptyTitle: {fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary},
  emptySub: {fontSize: Typography.sm, color: Colors.textMuted},
});

export default LeaderboardScreen;
