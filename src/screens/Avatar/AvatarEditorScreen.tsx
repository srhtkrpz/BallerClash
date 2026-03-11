import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors, Typography, Spacing, Radii, Shadows} from '../../constants/theme';
import type {AvatarConfig} from '../../types/models';
import type {RootStackParamList} from '../../navigation/AppNavigator';
import {getMyProfile, updateProfile} from '../../services/supabase/profilesService';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AvatarEditor'>;

const SKIN_TONES = ['#FDDBB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#4A2912'];
const HAIR_COLORS = ['#090806', '#2C1503', '#71290C', '#B55239', '#D6A04B', '#F5C57A', '#E8E8E8'];
const JERSEY_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#fbbf24', '#000000', '#ffffff'];

const DEFAULT_CONFIG: AvatarConfig = {
  skin: SKIN_TONES[0],
  hair: HAIR_COLORS[0],
  hairColor: HAIR_COLORS[0],
  jersey: JERSEY_COLORS[0],
  jerseyColor: JERSEY_COLORS[0],
  shorts: '#111111',
  shoes: '#ffffff',
};

type Category = 'skin' | 'hair' | 'jersey';

const CATEGORIES: {key: Category; label: string}[] = [
  {key: 'skin', label: 'Ten Rengi'},
  {key: 'hair', label: 'Saç Rengi'},
  {key: 'jersey', label: 'Forma Rengi'},
];

// ── ColorPicker ───────────────────────────────────────────────────────────────

const ColorPicker = ({
  colors,
  selected,
  onSelect,
}: {
  colors: string[];
  selected: string;
  onSelect: (c: string) => void;
}) => (
  <View style={av.colorRow}>
    {colors.map(c => (
      <TouchableOpacity
        key={c}
        style={[
          av.colorDot,
          {backgroundColor: c},
          selected === c && av.colorDotActive,
          c === '#ffffff' && {borderWidth: 1, borderColor: Colors.borderStrong},
        ]}
        onPress={() => onSelect(c)}
        activeOpacity={0.8}
      />
    ))}
  </View>
);

// ── Avatar Preview ────────────────────────────────────────────────────────────

const AvatarPreview = ({config}: {config: AvatarConfig}) => (
  <View style={av.figure}>
    {/* Head */}
    <View style={[av.head, {backgroundColor: config.skin}]}>
      <View style={[av.hair, {backgroundColor: config.hairColor}]} />
      {/* Eyes */}
      <View style={av.eyeRow}>
        <View style={av.eye} />
        <View style={av.eye} />
      </View>
    </View>
    {/* Jersey */}
    <View style={[av.jersey, {backgroundColor: config.jerseyColor}]}>
      <View style={av.jerseyStripe} />
    </View>
    {/* Shorts */}
    <View style={[av.shorts, {backgroundColor: config.shorts}]} />
    {/* Legs */}
    <View style={av.legRow}>
      <View style={[av.leg, {backgroundColor: config.skin}]} />
      <View style={[av.leg, {backgroundColor: config.skin}]} />
    </View>
    {/* Shoes */}
    <View style={av.shoeRow}>
      <View style={[av.shoe, {backgroundColor: config.shoes}]} />
      <View style={[av.shoe, {backgroundColor: config.shoes}]} />
    </View>
  </View>
);

// ── Screen ────────────────────────────────────────────────────────────────────

const AvatarEditorScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [activeCategory, setActiveCategory] = useState<Category>('skin');
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_CONFIG);
  const [initLoading, setInitLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyProfile().then(profile => {
      if (profile?.avatarConfig) {
        setConfig(profile.avatarConfig);
      }
      setInitLoading(false);
    });
  }, []);

  const update = (key: keyof AvatarConfig, value: string) =>
    setConfig(prev => ({...prev, [key]: value}));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({avatarConfig: config});
      Alert.alert('Kaydedildi', 'Avatar başarıyla güncellendi.', [
        {text: 'Tamam', onPress: () => navigation.goBack()},
      ]);
    } catch (err) {
      Alert.alert('Hata', 'Avatar kaydedilemedi. Tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  if (initLoading) {
    return (
      <View style={av.screen}>
        <View style={av.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={av.screen}>
      <SafeAreaView style={av.safe} edges={['bottom']}>

        {/* Avatar preview */}
        <View style={av.previewArea}>
          <View style={[av.previewCircle, {borderColor: config.jerseyColor}]}>
            <AvatarPreview config={config} />
          </View>
          <Text style={av.previewHint}>Önizleme</Text>
        </View>

        {/* Category tabs */}
        <View style={av.catRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[av.catBtn, activeCategory === cat.key && av.catBtnActive]}
              onPress={() => setActiveCategory(cat.key)}
              activeOpacity={0.8}>
              <Text style={[av.catLabel, activeCategory === cat.key && av.catLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Color options */}
        <ScrollView style={av.options} contentContainerStyle={av.optionsContent}>
          {activeCategory === 'skin' && (
            <ColorPicker
              colors={SKIN_TONES}
              selected={config.skin}
              onSelect={c => update('skin', c)}
            />
          )}
          {activeCategory === 'hair' && (
            <ColorPicker
              colors={HAIR_COLORS}
              selected={config.hairColor}
              onSelect={c => { update('hair', c); update('hairColor', c); }}
            />
          )}
          {activeCategory === 'jersey' && (
            <ColorPicker
              colors={JERSEY_COLORS}
              selected={config.jerseyColor}
              onSelect={c => { update('jersey', c); update('jerseyColor', c); }}
            />
          )}
        </ScrollView>

        {/* Save button */}
        <View style={av.bottom}>
          <TouchableOpacity
            style={[av.saveBtn, saving && av.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={av.saveBtnText}>Kaydet</Text>}
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const av = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  // Preview
  previewArea: {
    alignItems: 'center', paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  previewCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },

  // Figure
  figure: {alignItems: 'center', gap: 0},
  head: {
    width: 40, height: 40, borderRadius: 20,
    overflow: 'hidden', justifyContent: 'flex-start', alignItems: 'center',
  },
  hair: {height: 12, width: '100%'},
  eyeRow: {
    flexDirection: 'row', justifyContent: 'space-evenly',
    width: '100%', marginTop: 8,
  },
  eye: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  jersey: {width: 44, height: 30, borderRadius: 3, alignItems: 'center', justifyContent: 'center'},
  jerseyStripe: {width: 2, height: '70%', backgroundColor: 'rgba(255,255,255,0.25)'},
  shorts: {width: 38, height: 20, borderRadius: 2},
  legRow: {flexDirection: 'row', gap: 4},
  leg: {width: 14, height: 18, borderRadius: 2},
  shoeRow: {flexDirection: 'row', gap: 4},
  shoe: {width: 16, height: 7, borderRadius: 2},

  previewHint: {fontSize: Typography.xs, color: Colors.textMuted},

  // Category tabs
  catRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  catBtn: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.md,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  catBtnActive: {borderBottomColor: Colors.primary},
  catLabel: {fontSize: Typography.sm, color: Colors.textMuted, fontWeight: Typography.semibold},
  catLabelActive: {color: Colors.primary},

  // Colors
  options: {flex: 1},
  optionsContent: {padding: Spacing.xl},
  colorRow: {flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap'},
  colorDot: {width: 48, height: 48, borderRadius: 24},
  colorDotActive: {borderWidth: 3, borderColor: Colors.primary},

  // Save
  bottom: {
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radii.lg,
    paddingVertical: 14, alignItems: 'center', ...Shadows.glow,
  },
  saveBtnDisabled: {opacity: 0.5},
  saveBtnText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},
});

export default AvatarEditorScreen;
