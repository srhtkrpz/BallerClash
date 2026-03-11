import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors, Typography, Spacing, Radii, Shadows} from '../../constants/theme';
import type {TeamsStackParamList} from '../../navigation/AppNavigator';
import type {City} from '../../types/models';
import {createTeam} from '../../services/supabase/teamsService';
import {getMyProfile} from '../../services/supabase/profilesService';

type NavProp = NativeStackNavigationProp<TeamsStackParamList, 'CreateTeam'>;

const TEAM_COLORS = [
  {hex: '#f97316', label: 'Turuncu'},
  {hex: '#3b82f6', label: 'Mavi'},
  {hex: '#22c55e', label: 'Yeşil'},
  {hex: '#a855f7', label: 'Mor'},
  {hex: '#ef4444', label: 'Kırmızı'},
  {hex: '#fbbf24', label: 'Altın'},
];

const CITY_LABELS: Record<City, string> = {
  istanbul: 'İstanbul',
  ankara: 'Ankara',
  izmir: 'İzmir',
};

const CreateTeamScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [teamName, setTeamName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0].hex);
  const [myCity, setMyCity] = useState<City | null>(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    getMyProfile().then(profile => {
      if (profile) {
        setMyCity(profile.city);
      }
      setInitLoading(false);
    });
  }, []);

  const handleCreate = async () => {
    const name = teamName.trim();
    if (!name) {return;}

    if (name.length < 3) {
      Alert.alert('Hata', 'Takım adı en az 3 karakter olmalı.');
      return;
    }

    if (!myCity) {
      Alert.alert(
        'Profil Eksik',
        'Takım oluşturmak için önce profilini tamamlaman gerekiyor.',
        [{text: 'Tamam', onPress: () => navigation.goBack()}],
      );
      return;
    }

    setLoading(true);
    try {
      await createTeam(name, myCity, selectedColor);
      navigation.goBack();
    } catch (err: any) {
      const msg: string = err?.message ?? 'Takım oluşturulamadı.';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        Alert.alert('Hata', 'Bu isimde bir takım zaten var. Farklı bir isim dene.');
      } else {
        Alert.alert('Hata', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <View style={s.screen}>
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </View>
    );
  }

  const initial = teamName.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Logo preview */}
          <View style={s.logoSection}>
            <View style={[s.logo, {backgroundColor: selectedColor, ...Shadows.glow}]}>
              <Text style={s.logoInitial}>{initial}</Text>
            </View>
            <Text style={s.logoCaption}>Takım Logosu</Text>
          </View>

          {/* Team name */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>TAKIM ADI</Text>
            <TextInput
              style={s.input}
              placeholder="örn. Boğaziçi Ballers"
              placeholderTextColor={Colors.textMuted}
              value={teamName}
              onChangeText={setTeamName}
              maxLength={24}
              autoCapitalize="words"
            />
            <Text style={s.fieldHint}>{teamName.length}/24</Text>
          </View>

          {/* Color picker */}
          <View style={s.field}>
            <Text style={s.fieldLabel}>TAKIM RENGİ</Text>
            <View style={s.colorRow}>
              {TEAM_COLORS.map(c => (
                <TouchableOpacity
                  key={c.hex}
                  style={[
                    s.colorDot,
                    {backgroundColor: c.hex},
                    selectedColor === c.hex && s.colorDotActive,
                  ]}
                  onPress={() => setSelectedColor(c.hex)}
                  activeOpacity={0.8}
                />
              ))}
            </View>
          </View>

          {/* City info */}
          {myCity && (
            <View style={s.cityBox}>
              <Text style={s.cityLabel}>📍 Şehir</Text>
              <Text style={s.cityValue}>{CITY_LABELS[myCity]}</Text>
              <Text style={s.cityNote}>Takımın profil şehrine göre oluşturulur.</Text>
            </View>
          )}

          {/* Info */}
          <View style={s.infoBox}>
            <Text style={s.infoText}>
              Kaptan olarak sen atanırsın. Takımı oluşturduktan sonra oyuncuları kullanıcı adıyla arayarak davet edebilirsin.
            </Text>
          </View>

          <TouchableOpacity
            style={[s.btn, (!teamName.trim() || loading) && s.btnDisabled]}
            onPress={handleCreate}
            disabled={!teamName.trim() || loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Takımı Oluştur</Text>}
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  scroll: {padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xxxl},

  // Logo
  logoSection: {alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg},
  logo: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  logoInitial: {fontSize: 46, fontWeight: Typography.black, color: '#fff'},
  logoCaption: {fontSize: Typography.xs, color: Colors.textMuted},

  // Field
  field: {gap: Spacing.sm},
  fieldLabel: {fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textMuted, letterSpacing: 1.2},
  fieldHint: {fontSize: Typography.xs, color: Colors.textMuted, textAlign: 'right', marginTop: -Spacing.xs},
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    color: Colors.textPrimary, fontSize: Typography.base,
  },

  // Color
  colorRow: {flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap'},
  colorDot: {width: 42, height: 42, borderRadius: 21},
  colorDotActive: {borderWidth: 3, borderColor: '#fff'},

  // City
  cityBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.lg, gap: 4,
  },
  cityLabel: {fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textMuted, letterSpacing: 1},
  cityValue: {fontSize: Typography.lg, fontWeight: Typography.heavy, color: Colors.textPrimary},
  cityNote: {fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2},

  // Info
  infoBox: {
    backgroundColor: Colors.primarySubtle, borderRadius: Radii.lg,
    borderWidth: 1, borderColor: Colors.primaryGlow, padding: Spacing.md,
  },
  infoText: {fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20},

  // Button
  btn: {
    backgroundColor: Colors.primary, borderRadius: Radii.lg,
    paddingVertical: 15, alignItems: 'center', ...Shadows.glow,
  },
  btnDisabled: {opacity: 0.4},
  btnText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},
});

export default CreateTeamScreen;
