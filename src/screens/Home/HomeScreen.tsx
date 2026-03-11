import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors, Typography, Spacing, Radii, Shadows} from '../../constants/theme';
import type {Match, City} from '../../types/models';
import type {HomeStackParamList} from '../../navigation/AppNavigator';
import {getOpenMatches} from '../../services/supabase/matchesService';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;

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
  completed: Colors.textMuted,
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Rakip Aranıyor',
  pending: 'Yanıt Bekleniyor',
  confirmed: 'Onaylandı',
  completed: 'Tamamlandı',
};

const MatchCard = ({match, onPress}: {match: Match; onPress: () => void}) => {
  const date = new Date(match.scheduledAt).toLocaleDateString('tr-TR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      {/* Status badge */}
      <View style={[s.badge, {backgroundColor: `${STATUS_COLOR[match.status]}20`}]}>
        <View style={[s.badgeDot, {backgroundColor: STATUS_COLOR[match.status]}]} />
        <Text style={[s.badgeText, {color: STATUS_COLOR[match.status]}]}>
          {STATUS_LABEL[match.status]}
        </Text>
      </View>

      {/* Teams row */}
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

      {/* Info */}
      <View style={s.cardFooter}>
        <Text style={s.courtName}>📍 {match.courtName}</Text>
        <Text style={s.matchDate}>{date}</Text>
      </View>
    </TouchableOpacity>
  );
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cityFilter, setCityFilter] = useState<City | 'all'>('all');

  const loadMatches = useCallback(async () => {
    const city = cityFilter === 'all' ? undefined : cityFilter;
    const data = await getOpenMatches(city);
    setMatches(data);
    setLoading(false);
    setRefreshing(false);
  }, [cityFilter]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadMatches();
  }, [loadMatches]));

  const handleCityFilter = (key: City | 'all') => {
    setCityFilter(key);
    setLoading(true);
  };

  const filtered = cityFilter === 'all' ? matches : matches.filter(m => m.city === cityFilter);

  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Maçlar</Text>
          <TouchableOpacity
            style={s.createBtn}
            activeOpacity={0.8}
            onPress={() => Alert.alert('Yakında', 'Maç oluşturma özelliği yakında geliyor!')}>
            <Text style={s.createBtnText}>+ Maç Oluştur</Text>
          </TouchableOpacity>
        </View>

        {/* City filter */}
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

        {/* List */}
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
                onRefresh={() => {setRefreshing(true); loadMatches();}}
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
});

export default HomeScreen;
