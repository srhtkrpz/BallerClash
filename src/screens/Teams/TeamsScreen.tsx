import React, {useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {Colors, Typography, Spacing, Radii, Shadows} from '../../constants/theme';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {TeamsStackParamList} from '../../navigation/AppNavigator';
import type {Team, Profile} from '../../types/models';
import {getMyTeam, inviteMember, leaveTeam} from '../../services/supabase/teamsService';
import {searchUsersByUsername} from '../../services/supabase/profilesService';
import {getCurrentUser} from '../../services/supabase/client';

type NavProp = NativeStackNavigationProp<TeamsStackParamList, 'TeamsMain'>;

const MAX_TEAM_SIZE = 4;

const getRatingColor = (r: number) => {
  if (r >= 8.5) {return Colors.ratingElite;}
  if (r >= 7.0) {return Colors.ratingGood;}
  if (r >= 5.5) {return Colors.ratingAvg;}
  return Colors.ratingLow;
};

const TeamsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [team, setTeam] = useState<Team | null>(null);
  const [myUserId, setMyUserId] = useState('');
  const [loading, setLoading] = useState(true);

  // Invite state
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    const [data, user] = await Promise.all([getMyTeam(), getCurrentUser()]);
    setTeam(data);
    setMyUserId(user?.id ?? '');
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setShowInvite(false);
    setSearchQuery('');
    setSearchResults([]);
    loadTeam();
  }, [loadTeam]));

  const handleSearch = async () => {
    if (!searchQuery.trim()) {return;}
    setSearching(true);
    const results = await searchUsersByUsername(searchQuery);
    // Filter out users already in this team
    const memberIds = team?.members.map(m => m.userId) ?? [];
    setSearchResults(results.filter(p => !memberIds.includes(p.id)));
    setSearching(false);
  };

  const handleInvite = async (profile: Profile) => {
    if (!team) {return;}
    if (team.members.length >= MAX_TEAM_SIZE) {
      Alert.alert('Kapasite Dolu', `Takımda en fazla ${MAX_TEAM_SIZE} oyuncu olabilir.`);
      return;
    }
    setInvitingId(profile.id);
    try {
      await inviteMember(team.id, profile.id);
      await loadTeam();
      setSearchResults(prev => prev.filter(p => p.id !== profile.id));
      Alert.alert('Başarılı', `${profile.username} takıma eklendi! 🏀`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Davet gönderilemedi.';
      Alert.alert('Hata', msg);
    } finally {
      setInvitingId(null);
    }
  };

  const handleLeave = () => {
    if (!team) {return;}
    Alert.alert(
      'Takımdan Ayrıl',
      `${team.name} takımından ayrılmak istediğine emin misin?`,
      [
        {text: 'Vazgeç', style: 'cancel'},
        {
          text: 'Ayrıl',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveTeam(team.id);
              setTeam(null);
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Hata oluştu.';
              Alert.alert('Hata', msg);
            }
          },
        },
      ],
    );
  };

  const amICaptain = myUserId === team?.captainId;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>Takımım</Text>
          {!team && !loading && (
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
        ) : !team ? (
          // ── No team ───────────────────────────────────────────────
          <View style={s.center}>
            <Text style={s.emptyIcon}>🏀</Text>
            <Text style={s.emptyTitle}>Takımın yok</Text>
            <Text style={s.emptySub}>Bir takım kur, arkadaşlarını davet et.</Text>
            <TouchableOpacity
              style={s.cta}
              onPress={() => navigation.navigate('CreateTeam')}
              activeOpacity={0.85}>
              <Text style={s.ctaText}>Takım Kur</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // ── Has team ──────────────────────────────────────────────
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

            {/* Team card */}
            <View style={s.teamCard}>
              <View style={[s.logoCircle, {backgroundColor: team.logoColor + '33', borderColor: team.logoColor}]}>
                <Text style={s.logoInitial}>
                  {team.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={s.teamName}>{team.name}</Text>
              <Text style={s.teamCity}>
                {team.city.charAt(0).toUpperCase() + team.city.slice(1)}
              </Text>
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

            {/* Members section */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>KADRO</Text>
                <Text style={s.sectionCount}>{team.members.length}/{MAX_TEAM_SIZE}</Text>
              </View>

              {team.members.map(member => (
                <View key={member.userId} style={s.memberRow}>
                  <View style={s.memberAvatar}>
                    <Text style={s.memberAvatarEmoji}>⛹️</Text>
                  </View>
                  <View style={s.memberInfo}>
                    <View style={s.memberNameRow}>
                      <Text style={s.memberName}>{member.username}</Text>
                      {member.role === 'captain' && (
                        <View style={s.captainBadge}>
                          <Text style={s.captainBadgeText}>Kaptan</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.memberRole}>
                      {member.role === 'captain' ? '⭐ Kaptan' : '⛹️ Oyuncu'}
                    </Text>
                  </View>
                  <Text style={[s.memberRating, {color: getRatingColor(member.avgRating)}]}>
                    {member.avgRating > 0 ? member.avgRating.toFixed(1) : '—'}
                  </Text>
                </View>
              ))}
            </View>

            {/* Captain actions */}
            {amICaptain && team.members.length < MAX_TEAM_SIZE && (
              <View style={s.section}>
                <TouchableOpacity
                  style={s.inviteToggleBtn}
                  onPress={() => {
                    setShowInvite(prev => !prev);
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  activeOpacity={0.85}>
                  <Text style={s.inviteToggleBtnText}>
                    {showInvite ? '✕ Aramayı Kapat' : '+ Oyuncu Davet Et'}
                  </Text>
                </TouchableOpacity>

                {showInvite && (
                  <View style={s.inviteSection}>
                    <Text style={s.inviteHint}>
                      Takıma katılmak isteyen oyuncunun kullanıcı adını gir.
                    </Text>
                    <View style={s.searchRow}>
                      <TextInput
                        style={s.searchInput}
                        placeholder="kullanici_adi"
                        placeholderTextColor={Colors.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        returnKeyType="search"
                        onSubmitEditing={handleSearch}
                      />
                      <TouchableOpacity
                        style={[s.searchBtn, searching && s.searchBtnDisabled]}
                        onPress={handleSearch}
                        disabled={searching}
                        activeOpacity={0.85}>
                        {searching
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={s.searchBtnText}>Ara</Text>}
                      </TouchableOpacity>
                    </View>

                    {searchResults.length === 0 && !searching && searchQuery.length > 0 && (
                      <View style={s.searchEmpty}>
                        <Text style={s.searchEmptyText}>
                          Kullanıcı bulunamadı veya zaten bir takımda.
                        </Text>
                      </View>
                    )}

                    {searchResults.map(profile => (
                      <View key={profile.id} style={s.searchResult}>
                        <View style={s.searchResultAvatar}>
                          <Text style={s.searchResultAvatarEmoji}>⛹️</Text>
                        </View>
                        <View style={s.searchResultInfo}>
                          <Text style={s.searchResultName}>{profile.username}</Text>
                          <Text style={s.searchResultCity}>
                            {profile.city.charAt(0).toUpperCase() + profile.city.slice(1)} · {profile.position}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[s.addBtn, invitingId === profile.id && s.addBtnDisabled]}
                          onPress={() => handleInvite(profile)}
                          disabled={invitingId === profile.id}
                          activeOpacity={0.85}>
                          {invitingId === profile.id
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={s.addBtnText}>Ekle</Text>}
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Capacity full info */}
            {amICaptain && team.members.length >= MAX_TEAM_SIZE && (
              <View style={s.capacityBox}>
                <Text style={s.capacityText}>
                  ✅ Kadro tamamdır ({MAX_TEAM_SIZE}/{MAX_TEAM_SIZE} oyuncu).
                </Text>
              </View>
            )}

            {/* Leave team (non-captains only) */}
            {!amICaptain && (
              <TouchableOpacity
                style={s.leaveBtn}
                onPress={handleLeave}
                activeOpacity={0.8}>
                <Text style={s.leaveBtnText}>Takımdan Ayrıl</Text>
              </TouchableOpacity>
            )}

          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  title: {fontSize: Typography.xxl, fontWeight: Typography.black, color: Colors.textPrimary, letterSpacing: -0.5},
  createBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md,
    paddingVertical: 8, borderRadius: Radii.full,
  },
  createBtnText: {color: '#fff', fontSize: Typography.sm, fontWeight: Typography.bold},

  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: Spacing.xl},
  emptyIcon: {fontSize: 52},
  emptyTitle: {fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary},
  emptySub: {fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center'},
  cta: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl,
    paddingVertical: 13, borderRadius: Radii.lg, marginTop: 4,
  },
  ctaText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},

  scroll: {paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xxxl, gap: Spacing.xl},

  // Team card
  teamCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.xl, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, ...Shadows.card,
  },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  logoInitial: {fontSize: 36, fontWeight: Typography.black, color: '#fff'},
  teamName: {fontSize: Typography.xl, fontWeight: Typography.heavy, color: Colors.textPrimary},
  teamCity: {fontSize: Typography.sm, color: Colors.textMuted},
  statsRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm,
    width: '100%', backgroundColor: Colors.surface,
    borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  statItem: {flex: 1, paddingVertical: Spacing.md, alignItems: 'center', gap: 2},
  statValue: {fontSize: Typography.xl, fontWeight: Typography.heavy, color: Colors.textPrimary},
  statLabel: {fontSize: Typography.xs, color: Colors.textMuted},
  statDivider: {width: 1, height: 36, backgroundColor: Colors.border},

  // Section
  section: {gap: Spacing.md},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sectionTitle: {fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textMuted, letterSpacing: 1.2},
  sectionCount: {fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textMuted},

  // Member row
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.md,
  },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarEmoji: {fontSize: 20},
  memberInfo: {flex: 1, gap: 2},
  memberNameRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  memberName: {fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary},
  captainBadge: {
    backgroundColor: Colors.primarySubtle, borderRadius: Radii.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  captainBadgeText: {fontSize: 10, fontWeight: Typography.bold, color: Colors.primary},
  memberRole: {fontSize: Typography.xs, color: Colors.textMuted},
  memberRating: {fontSize: Typography.lg, fontWeight: Typography.black},

  // Invite toggle
  inviteToggleBtn: {
    borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center',
  },
  inviteToggleBtnText: {color: Colors.primary, fontSize: Typography.base, fontWeight: Typography.bold},

  // Invite section
  inviteSection: {
    backgroundColor: Colors.surface, borderRadius: Radii.xl,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg, gap: Spacing.md,
  },
  inviteHint: {fontSize: Typography.sm, color: Colors.textMuted},
  searchRow: {flexDirection: 'row', gap: Spacing.sm},
  searchInput: {
    flex: 1, backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    color: Colors.textPrimary, fontSize: Typography.base,
  },
  searchBtn: {
    backgroundColor: Colors.primary, borderRadius: Radii.lg,
    paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center',
  },
  searchBtnDisabled: {opacity: 0.5},
  searchBtnText: {color: '#fff', fontSize: Typography.sm, fontWeight: Typography.bold},
  searchEmpty: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radii.md,
    padding: Spacing.md, alignItems: 'center',
  },
  searchEmptyText: {fontSize: Typography.sm, color: Colors.textMuted},

  // Search result
  searchResult: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceElevated, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.md,
  },
  searchResultAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center',
  },
  searchResultAvatarEmoji: {fontSize: 20},
  searchResultInfo: {flex: 1},
  searchResultName: {fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary},
  searchResultCity: {fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2},
  addBtn: {
    backgroundColor: Colors.accentGreen, borderRadius: Radii.md,
    paddingHorizontal: Spacing.md, paddingVertical: 8, minWidth: 56, alignItems: 'center',
  },
  addBtnDisabled: {opacity: 0.5},
  addBtnText: {color: '#fff', fontSize: Typography.sm, fontWeight: Typography.bold},

  // Capacity
  capacityBox: {
    backgroundColor: `${Colors.accentGreen}15`,
    borderRadius: Radii.lg, borderWidth: 1, borderColor: `${Colors.accentGreen}40`,
    padding: Spacing.md, alignItems: 'center',
  },
  capacityText: {fontSize: Typography.sm, color: Colors.accentGreen, fontWeight: Typography.semibold},

  // Leave button
  leaveBtn: {
    marginTop: Spacing.md, padding: Spacing.md, alignItems: 'center',
    borderRadius: Radii.lg, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  leaveBtnText: {color: Colors.accentRed, fontSize: Typography.sm, fontWeight: Typography.semibold},
});

export default TeamsScreen;
