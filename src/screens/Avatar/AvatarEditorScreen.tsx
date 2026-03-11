import React, {useState} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radii} from '../../constants/theme';
import type {AvatarConfig} from '../../types/models';

const SKIN_TONES = ['#FDDBB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#4A2912'];
const HAIR_COLORS = ['#090806', '#2C1503', '#71290C', '#B55239', '#D6A04B', '#F5C57A', '#E8E8E8'];
const JERSEY_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#000000', '#ffffff'];

type Category = 'skin' | 'hair' | 'jersey' | 'accessory';

const CATEGORIES: {key: Category; label: string; emoji: string}[] = [
  {key: 'skin', label: 'Ten', emoji: '✋'},
  {key: 'hair', label: 'Saç', emoji: '💇'},
  {key: 'jersey', label: 'Forma', emoji: '👕'},
  {key: 'accessory', label: 'Aksesuar', emoji: '🕶️'},
];

const ColorPicker = ({
  colors, selected, onSelect,
}: {colors: string[]; selected: string; onSelect: (c: string) => void}) => (
  <View style={av.colorRow}>
    {colors.map(c => (
      <TouchableOpacity
        key={c}
        style={[av.colorDot, {backgroundColor: c}, selected === c && av.colorDotActive,
          c === '#ffffff' && {borderWidth: 1, borderColor: Colors.border}]}
        onPress={() => onSelect(c)}
        activeOpacity={0.8}
      />
    ))}
  </View>
);

const AvatarEditorScreen: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('skin');
  const [config, setConfig] = useState<AvatarConfig>({
    skin: SKIN_TONES[0],
    hair: '#090806',
    hairColor: '#090806',
    jersey: '#f97316',
    jerseyColor: '#f97316',
    shorts: '#111111',
    shoes: '#ffffff',
  });

  const update = (key: keyof AvatarConfig, value: string) =>
    setConfig(prev => ({...prev, [key]: value}));

  return (
    <View style={av.screen}>
      <SafeAreaView style={av.safe} edges={['bottom']}>

        {/* Avatar preview */}
        <View style={av.previewArea}>
          <View style={av.avatarBody}>
            {/* Head */}
            <View style={[av.head, {backgroundColor: config.skin}]}>
              <View style={[av.hair, {backgroundColor: config.hairColor}]} />
            </View>
            {/* Torso */}
            <View style={[av.torso, {backgroundColor: config.jerseyColor}]} />
            {/* Shorts */}
            <View style={[av.shorts, {backgroundColor: config.shorts}]} />
          </View>
          <Text style={av.previewHint}>Önizleme · gerçek avatar yakında</Text>
        </View>

        {/* Category tabs */}
        <View style={av.catRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[av.catBtn, activeCategory === cat.key && av.catBtnActive]}
              onPress={() => setActiveCategory(cat.key)}
              activeOpacity={0.8}>
              <Text style={av.catEmoji}>{cat.emoji}</Text>
              <Text style={[av.catLabel, activeCategory === cat.key && av.catLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Options */}
        <ScrollView style={av.options} contentContainerStyle={av.optionsContent}>
          {activeCategory === 'skin' && (
            <ColorPicker colors={SKIN_TONES} selected={config.skin} onSelect={c => update('skin', c)} />
          )}
          {activeCategory === 'hair' && (
            <ColorPicker colors={HAIR_COLORS} selected={config.hairColor} onSelect={c => {update('hair', c); update('hairColor', c);}} />
          )}
          {activeCategory === 'jersey' && (
            <ColorPicker colors={JERSEY_COLORS} selected={config.jerseyColor} onSelect={c => {update('jersey', c); update('jerseyColor', c);}} />
          )}
          {activeCategory === 'accessory' && (
            <Text style={av.comingSoon}>Aksesuarlar yakında eklenecek 🕶️</Text>
          )}
        </ScrollView>

        {/* Save */}
        <View style={av.bottom}>
          <TouchableOpacity style={av.saveBtn} activeOpacity={0.85}>
            <Text style={av.saveBtnText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const av = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  previewArea: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarBody: {alignItems: 'center', gap: 0},
  head: {width: 64, height: 64, borderRadius: 32, overflow: 'hidden', justifyContent: 'flex-start'},
  hair: {height: 18, width: '100%'},
  torso: {width: 72, height: 56, borderRadius: 4},
  shorts: {width: 64, height: 36, borderRadius: 4},
  previewHint: {fontSize: Typography.xs, color: Colors.textMuted, marginTop: Spacing.sm},
  catRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  catBtn: {flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 4},
  catBtnActive: {borderBottomWidth: 2, borderBottomColor: Colors.primary},
  catEmoji: {fontSize: 20},
  catLabel: {fontSize: Typography.xs, color: Colors.textMuted, fontWeight: Typography.semibold},
  catLabelActive: {color: Colors.primary},
  options: {flex: 1},
  optionsContent: {padding: Spacing.xl},
  colorRow: {flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap'},
  colorDot: {width: 44, height: 44, borderRadius: 22},
  colorDotActive: {borderWidth: 3, borderColor: Colors.primary},
  comingSoon: {color: Colors.textMuted, fontSize: Typography.base, textAlign: 'center', marginTop: Spacing.xl},
  bottom: {padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border},
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},
});

export default AvatarEditorScreen;
