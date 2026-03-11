import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors, Typography, Spacing, Radii, Shadows} from '../../constants/theme';
import type {Court, City} from '../../types/models';
import type {HomeStackParamList} from '../../navigation/AppNavigator';
import {getCourts} from '../../services/supabase/courtsService';
import {createMatch} from '../../services/supabase/matchesService';
import {getMyTeam} from '../../services/supabase/teamsService';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'CreateMatch'>;

const CITY_CENTERS: {city: City; name: string; lat: number; lng: number}[] = [
  {city: 'istanbul', name: 'İstanbul', lat: 41.0082, lng: 28.9784},
  {city: 'ankara', name: 'Ankara', lat: 39.9334, lng: 32.8597},
  {city: 'izmir', name: 'İzmir', lat: 38.4192, lng: 27.1287},
];

const TIME_SLOTS = [
  '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
];

const TR_DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function detectCity(lat: number, lng: number): {city: City; name: string} | null {
  let nearest: {city: City; name: string} | null = null;
  let minDist = Infinity;

  for (const c of CITY_CENTERS) {
    const dist = Math.sqrt(Math.pow(lat - c.lat, 2) + Math.pow(lng - c.lng, 2));
    if (dist < minDist) {
      minDist = dist;
      nearest = {city: c.city, name: c.name};
    }
  }

  if (minDist > 1.5) {
    return null;
  }

  return nearest;
}

function buildDays(): {date: Date; dayLabel: string; numLabel: string}[] {
  const result = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    result.push({
      date: d,
      dayLabel: TR_DAYS[d.getDay()],
      numLabel: String(d.getDate()),
    });
  }
  return result;
}

const CreateMatchScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [detectedCity, setDetectedCity] = useState<{city: City; name: string} | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [days] = useState(buildDays);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [myTeamName, setMyTeamName] = useState<string>('');
  const [myTeamId, setMyTeamId] = useState<string>('');

  const init = useCallback(async () => {
    // Check team first
    const team = await getMyTeam();
    if (!team) {
      Alert.alert(
        'Takım Gerekli',
        'Maç oluşturmak için önce bir takım kurman gerekiyor.',
        [{text: 'Tamam', onPress: () => navigation.goBack()}],
      );
      return;
    }
    setMyTeamId(team.id);
    setMyTeamName(team.name);

    // Request location
    const {status} = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError('Konum izni reddedildi. Lütfen ayarlardan konum iznini etkinleştir.');
      return;
    }

    let coords: {latitude: number; longitude: number};
    try {
      const loc = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
      coords = loc.coords;
    } catch {
      setLocationError('Konum alınamadı. Lütfen GPS\'ini etkinleştir ve tekrar dene.');
      return;
    }

    const city = detectCity(coords.latitude, coords.longitude);
    if (!city) {
      setLocationError('Bu özellik şu an sadece İstanbul, Ankara ve İzmir\'de kullanılabilir.');
      return;
    }

    setDetectedCity(city);

    const fetched = await getCourts(city.city);
    setCourts(fetched);
    setStep(1);
  }, [navigation]);

  useEffect(() => {
    init();
  }, [init]);

  const handleCreateMatch = async () => {
    if (!selectedCourt || !selectedDay || !selectedTime || !detectedCity) {
      return;
    }

    setSubmitting(true);
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledAt = new Date(selectedDay);
      scheduledAt.setHours(hours, minutes, 0, 0);

      await createMatch({
        courtId: selectedCourt.id,
        courtName: selectedCourt.name,
        city: detectedCity.city,
        scheduledAt: scheduledAt.toISOString(),
        challengerTeamId: myTeamId,
        challengerTeamName: myTeamName,
      });

      navigation.goBack();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      Alert.alert('Hata', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatScheduledAt = (): string => {
    if (!selectedDay || !selectedTime) {
      return '';
    }
    const d = selectedDay;
    return `${TR_DAYS[d.getDay()]} ${d.getDate()} ${TR_MONTHS[d.getMonth()]} · ${selectedTime}`;
  };

  // Step 0 — location detection
  if (step === 0) {
    return (
      <View style={s.screen}>
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backBtnText}>← Geri</Text>
          </TouchableOpacity>
          <View style={s.center}>
            {locationError ? (
              <>
                <Text style={s.locationErrorIcon}>📍</Text>
                <Text style={s.locationErrorTitle}>Konum Algılanamadı</Text>
                <Text style={s.locationErrorMsg}>{locationError}</Text>
                <TouchableOpacity style={s.primaryBtn} onPress={() => { setLocationError(null); init(); }}>
                  <Text style={s.primaryBtnText}>Tekrar Dene</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={s.detectingText}>GPS konumun algılanıyor...</Text>
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => (step === 1 ? navigation.goBack() : setStep((step - 1) as 1 | 2))}>
            <Text style={s.backBtnText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={s.topTitle}>Maç Oluştur</Text>
          <View style={s.dotsRow}>
            {([1, 2, 3] as const).map(n => (
              <View key={n} style={[s.dot, step >= n && s.dotActive]} />
            ))}
          </View>
        </View>

        {/* Step 1 — Court selection */}
        {step === 1 && (
          <View style={s.stepContainer}>
            <Text style={s.stepTitle}>📍 {detectedCity?.name} sahaları</Text>
            <Text style={s.stepSub}>GPS konumun {detectedCity?.name} olarak tespit edildi.</Text>
            <FlatList
              data={courts}
              keyExtractor={c => c.id}
              contentContainerStyle={s.courtList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={s.emptyBox}>
                  <Text style={s.emptyText}>Bu şehirde kayıtlı saha bulunamadı.</Text>
                </View>
              }
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[s.courtCard, selectedCourt?.id === item.id && s.courtCardSelected]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCourt(item)}>
                  <View style={s.courtCardTop}>
                    <Text style={s.courtCardName}>{item.name}</Text>
                    <View style={[s.indoorBadge, item.isIndoor ? s.indoorBadgeIn : s.indoorBadgeOut]}>
                      <Text style={s.indoorBadgeText}>{item.isIndoor ? 'Kapalı' : 'Açık'}</Text>
                    </View>
                  </View>
                  <Text style={s.courtCardAddr}>{item.address}</Text>
                  {item.activePlayers !== undefined && (
                    <Text style={s.courtActivePlayers}>🏀 {item.activePlayers} aktif oyuncu</Text>
                  )}
                </TouchableOpacity>
              )}
            />
            <View style={s.bottomBar}>
              <TouchableOpacity
                style={[s.primaryBtn, !selectedCourt && s.primaryBtnDisabled]}
                disabled={!selectedCourt}
                activeOpacity={0.85}
                onPress={() => setStep(2)}>
                <Text style={s.primaryBtnText}>Devam →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 2 — Date & Time */}
        {step === 2 && (
          <View style={s.stepContainer}>
            <Text style={s.stepTitle}>Tarih ve Saat</Text>
            <Text style={s.stepSub}>Maç için uygun zaman diliminizi seçin.</Text>

            {/* Day picker */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.dayRow}
              style={s.dayScroll}>
              {days.map((d, i) => {
                const isSelected = selectedDay?.toDateString() === d.date.toDateString();
                return (
                  <TouchableOpacity
                    key={i}
                    style={[s.dayChip, isSelected && s.dayChipActive]}
                    onPress={() => setSelectedDay(d.date)}
                    activeOpacity={0.8}>
                    <Text style={[s.dayChipTop, isSelected && s.dayChipTextActive]}>{d.dayLabel}</Text>
                    <Text style={[s.dayChipNum, isSelected && s.dayChipTextActive]}>{d.numLabel}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Time slots grid */}
            <ScrollView showsVerticalScrollIndicator={false} style={s.timeSlotsScroll}>
              <View style={s.timeGrid}>
                {TIME_SLOTS.map(slot => {
                  const isSelected = selectedTime === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[s.timeChip, isSelected && s.timeChipActive]}
                      onPress={() => setSelectedTime(slot)}
                      activeOpacity={0.8}>
                      <Text style={[s.timeChipText, isSelected && s.timeChipTextActive]}>{slot}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={s.bottomBar}>
              <TouchableOpacity
                style={[s.primaryBtn, (!selectedDay || !selectedTime) && s.primaryBtnDisabled]}
                disabled={!selectedDay || !selectedTime}
                activeOpacity={0.85}
                onPress={() => setStep(3)}>
                <Text style={s.primaryBtnText}>Devam →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3 — Review & Create */}
        {step === 3 && (
          <ScrollView style={s.stepContainer} contentContainerStyle={s.reviewScroll} showsVerticalScrollIndicator={false}>
            <Text style={s.stepTitle}>Maçı İncele</Text>
            <Text style={s.stepSub}>Bilgileri kontrol et ve maçı oluştur.</Text>

            <View style={s.summaryCard}>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Saha</Text>
                <Text style={s.summaryValue}>{selectedCourt?.name}</Text>
              </View>
              <View style={s.summaryDivider} />
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Şehir</Text>
                <Text style={s.summaryValue}>{detectedCity?.name}</Text>
              </View>
              <View style={s.summaryDivider} />
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Tarih / Saat</Text>
                <Text style={s.summaryValue}>{formatScheduledAt()}</Text>
              </View>
              <View style={s.summaryDivider} />
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Takımın</Text>
                <Text style={[s.summaryValue, {color: Colors.primary}]}>{myTeamName}</Text>
              </View>
            </View>

            <View style={s.infoBox}>
              <Text style={s.infoBoxText}>
                Maç oluşturulduktan sonra diğer kaptanlar sana meydan okuyabilir.
                Gelen meydan okumaları "Davetler" sekmesinden kabul veya reddedebilirsin.
              </Text>
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, submitting && s.primaryBtnDisabled]}
              disabled={submitting}
              activeOpacity={0.85}
              onPress={handleCreateMatch}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnText}>Maç Oluştur 🏀</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg},
  backBtn: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm},
  backBtnText: {color: Colors.primary, fontSize: Typography.base, fontWeight: Typography.semibold},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  topTitle: {fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary},
  dotsRow: {flexDirection: 'row', gap: 6, alignItems: 'center'},
  dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border},
  dotActive: {backgroundColor: Colors.primary},
  stepContainer: {flex: 1, paddingHorizontal: Spacing.lg},
  stepTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    letterSpacing: -0.3,
  },
  stepSub: {fontSize: Typography.sm, color: Colors.textMuted, marginBottom: Spacing.lg},

  // Court list
  courtList: {gap: Spacing.md, paddingBottom: Spacing.xxxl},
  courtCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.xs,
    ...Shadows.card,
  },
  courtCardSelected: {borderColor: Colors.primary, borderWidth: 2},
  courtCardTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  courtCardName: {fontSize: Typography.base, fontWeight: Typography.heavy, color: Colors.textPrimary, flex: 1},
  indoorBadge: {paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radii.full},
  indoorBadgeIn: {backgroundColor: 'rgba(59, 130, 246, 0.18)'},
  indoorBadgeOut: {backgroundColor: 'rgba(34, 197, 94, 0.18)'},
  indoorBadgeText: {fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textSecondary},
  courtCardAddr: {fontSize: Typography.sm, color: Colors.textMuted},
  courtActivePlayers: {fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2},
  emptyBox: {paddingVertical: Spacing.xxxl, alignItems: 'center'},
  emptyText: {color: Colors.textMuted, fontSize: Typography.sm, textAlign: 'center'},

  // Day picker
  dayScroll: {flexGrow: 0, marginBottom: Spacing.lg},
  dayRow: {flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.xs},
  dayChip: {
    width: 52,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 2,
  },
  dayChipActive: {backgroundColor: Colors.primarySubtle, borderColor: Colors.primary},
  dayChipTop: {fontSize: Typography.xs, color: Colors.textMuted, fontWeight: Typography.semibold},
  dayChipNum: {fontSize: Typography.base, color: Colors.textPrimary, fontWeight: Typography.heavy},
  dayChipTextActive: {color: Colors.primary},

  // Time slots
  timeSlotsScroll: {flex: 1},
  timeGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingBottom: Spacing.xxxl},
  timeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 72,
    alignItems: 'center',
  },
  timeChipActive: {backgroundColor: Colors.primarySubtle, borderColor: Colors.primary},
  timeChipText: {fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary},
  timeChipTextActive: {color: Colors.primary},

  // Review
  reviewScroll: {paddingBottom: Spacing.xxxl},
  summaryCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  summaryRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm},
  summaryLabel: {fontSize: Typography.sm, color: Colors.textMuted},
  summaryValue: {fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary, flexShrink: 1, textAlign: 'right', marginLeft: Spacing.md},
  summaryDivider: {height: 1, backgroundColor: Colors.divider},
  infoBox: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  infoBoxText: {fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20},

  // Buttons
  bottomBar: {paddingTop: Spacing.md, paddingBottom: Spacing.sm},
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radii.xl,
    alignItems: 'center',
    ...Shadows.glow,
  },
  primaryBtnDisabled: {opacity: 0.4},
  primaryBtnText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},

  // Location error
  locationErrorIcon: {fontSize: 48, marginBottom: Spacing.sm},
  locationErrorTitle: {fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary},
  locationErrorMsg: {fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20},
  detectingText: {fontSize: Typography.base, color: Colors.textMuted, marginTop: Spacing.md},
});

export default CreateMatchScreen;
