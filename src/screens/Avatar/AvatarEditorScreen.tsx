import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, type LayoutChangeEvent,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Svg, {Rect, Line, Path, Circle} from 'react-native-svg';
import {Colors, Typography, Spacing, Radii, Shadows} from '../../constants/theme';
import type {AvatarConfig, HairStyle} from '../../types/models';
import type {RootStackParamList} from '../../navigation/AppNavigator';
import {getMyProfile, updateProfile} from '../../services/supabase/profilesService';
import BasketbolcuAvatar, {type AvatarColors} from '../../components/BasketbolcuAvatar';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'AvatarEditor'>;

// ── Palette & style definitions ───────────────────────────────────────────────

const SKIN_TONES    = ['#FDDBB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#4A2912'];
const HAIR_COLORS   = ['#111111', '#2C1503', '#71290C', '#B55239', '#D6A04B', '#F5E6A3', '#E8E8E8', '#FF6B9D'];
const EYE_COLORS    = ['#3a2a1a', '#1a0f00', '#1e5fa3', '#2d7a3a', '#7a5a1a', '#5a6a7a', '#8B4513', '#4B0082'];
const JERSEY_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#fbbf24', '#111111', '#ffffff'];
const SHORTS_COLORS = ['#111111', '#1e3a8a', '#14532d', '#7f1d1d', '#4a044e', '#78350f', '#374151', '#ffffff'];
const SHOES_COLORS  = ['#111111', '#ffffff', '#f97316', '#3b82f6', '#22c55e', '#ef4444', '#a855f7', '#fbbf24'];

const HAIR_STYLES: {key: HairStyle; label: string; desc: string}[] = [
  {key: 'short',  label: 'Kısa',      desc: 'Klasik kesim'},
  {key: 'fade',   label: 'Fade',      desc: 'Temiz kenarlı'},
  {key: 'curly',  label: 'Kıvırcık',  desc: 'Doğal bukle'},
  {key: 'afro',   label: 'Afro',      desc: 'Hacimli puf'},
  {key: 'buzz',   label: 'Buzz',      desc: 'Çok kısa'},
];

type Category = 'skin' | 'hairStyle' | 'hair' | 'eye' | 'jersey' | 'number' | 'shorts' | 'shoes';
type PickerType = 'color' | 'style' | 'number';

const CATEGORIES: {key: Category; label: string; type: PickerType}[] = [
  {key: 'skin',      label: 'Ten',        type: 'color'},
  {key: 'hairStyle', label: 'Saç Stili',  type: 'style'},
  {key: 'hair',      label: 'Saç Rengi',  type: 'color'},
  {key: 'eye',       label: 'Göz',        type: 'color'},
  {key: 'jersey',    label: 'Forma',      type: 'color'},
  {key: 'number',    label: 'Numara',     type: 'number'},
  {key: 'shorts',    label: 'Şort',       type: 'color'},
  {key: 'shoes',     label: 'Ayakkabı',   type: 'color'},
];

const DEFAULT_COLORS: AvatarColors = {
  skin:          SKIN_TONES[1],
  hairColor:     HAIR_COLORS[0],
  hairStyle:     'short',
  eyeColor:      EYE_COLORS[0],
  jerseyColor:   JERSEY_COLORS[0],
  jerseyNumber:  23,
  shortsColor:   SHORTS_COLORS[0],
  shoesColor:    SHOES_COLORS[0],
};

function configToColors(cfg: AvatarConfig): AvatarColors {
  return {
    skin:          cfg.skin          ?? DEFAULT_COLORS.skin,
    hairColor:     cfg.hairColor     ?? DEFAULT_COLORS.hairColor,
    hairStyle:     (cfg.hairStyle    ?? DEFAULT_COLORS.hairStyle) as HairStyle,
    eyeColor:      cfg.eyeColor      ?? DEFAULT_COLORS.eyeColor,
    jerseyColor:   cfg.jerseyColor   ?? DEFAULT_COLORS.jerseyColor,
    jerseyNumber:  cfg.jerseyNumber  ?? DEFAULT_COLORS.jerseyNumber,
    shortsColor:   cfg.shorts        ?? DEFAULT_COLORS.shortsColor,
    shoesColor:    cfg.shoes         ?? DEFAULT_COLORS.shoesColor,
  };
}

function colorsToConfig(colors: AvatarColors): Partial<AvatarConfig> {
  return {
    skin:          colors.skin,
    hair:          colors.hairColor,
    hairColor:     colors.hairColor,
    hairStyle:     colors.hairStyle,
    eyeColor:      colors.eyeColor,
    jersey:        colors.jerseyColor,
    jerseyColor:   colors.jerseyColor,
    jerseyNumber:  colors.jerseyNumber,
    shorts:        colors.shortsColor,
    shoes:         colors.shoesColor,
  };
}

// ── Court background ─────────────────────────────────────────────────────────

const CourtBackground = ({width: w, height: h}: {width: number; height: number}) => {
  if (w === 0 || h === 0) {return null;}
  const cx      = w / 2;
  // Free throw line at 50% → screen center when preview ≈ full screen
  const keyY    = h * 0.50;   // free throw line
  const basketY = h * 0.86;   // basket/rim
  const keyH    = basketY - keyY;
  const keyW    = w * 0.34;
  const keyX    = cx - keyW / 2;
  const ftR     = w * 0.12;
  // Three-point circle centered at basket — large, clips at screen edges
  const threeR  = w * 0.52;
  const plankCount = 18;

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      {/* Wood floor base */}
      <Rect width={w} height={h} fill="#C8844A" />
      <Rect width={w} height={h} fill="#8B4A10" opacity="0.16" />

      {/* Horizontal planks */}
      {Array.from({length: plankCount}, (_, i) => {
        const y = (h / plankCount) * (i + 1);
        return <Line key={i} x1="0" y1={y} x2={w} y2={y} stroke="#9A5C20" strokeWidth="1" opacity="0.32" />;
      })}

      {/* Vertical grain */}
      {[0.10, 0.22, 0.35, 0.50, 0.65, 0.78, 0.90].map((frac, i) => (
        <Line key={`g${i}`} x1={w * frac} y1="0" x2={w * frac} y2={h}
          stroke="#9A5C20" strokeWidth="0.6" opacity="0.16" />
      ))}

      {/* Half-court line at top */}
      <Line x1="0" y1="3" x2={w} y2="3" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" />
      {/* Center circle (partial, at top edge) */}
      <Circle cx={cx} cy="3" r={h * 0.11}
        fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />

      {/* Three-point circle (large, clips naturally at sides + bottom) */}
      <Circle cx={cx} cy={basketY} r={threeR}
        fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" />

      {/* Baseline */}
      <Line x1="0" y1={h - 4} x2={w} y2={h - 4} stroke="rgba(255,255,255,0.70)" strokeWidth="2.5" />

      {/* Paint area fill */}
      <Rect x={keyX} y={keyY} width={keyW} height={keyH} fill="rgba(160,75,15,0.28)" />

      {/* Key outline */}
      <Rect x={keyX} y={keyY} width={keyW} height={keyH}
        fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" />

      {/* Free throw circle — bottom half (solid, inside key) */}
      <Path
        d={`M ${cx - ftR} ${keyY} A ${ftR} ${ftR} 0 0 0 ${cx + ftR} ${keyY}`}
        fill="none" stroke="rgba(255,255,255,0.60)" strokeWidth="2" />
      {/* Free throw circle — top half (dashed, outside key) */}
      <Path
        d={`M ${cx - ftR} ${keyY} A ${ftR} ${ftR} 0 0 1 ${cx + ftR} ${keyY}`}
        fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="2" strokeDasharray="5,5" />

      {/* Backboard */}
      <Rect x={cx - 14} y={basketY - 8} width={28} height={4} rx="1.5"
        fill="rgba(255,255,255,0.80)" />
      {/* Rim */}
      <Circle cx={cx} cy={basketY} r="8"
        fill="none" stroke="#e8650a" strokeWidth="2.5" />

      {/* Subtle vignette */}
      <Rect width={w} height={h} fill="rgba(0,0,0,0.08)" />
    </Svg>
  );
};

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
  <View style={s.colorRow}>
    {colors.map(c => (
      <TouchableOpacity
        key={c}
        style={[
          s.colorDot,
          {backgroundColor: c},
          selected === c && s.colorDotActive,
          c === '#ffffff' && {borderWidth: 1, borderColor: Colors.borderStrong},
        ]}
        onPress={() => onSelect(c)}
        activeOpacity={0.75}
      />
    ))}
  </View>
);

// ── StylePicker ───────────────────────────────────────────────────────────────

const StylePicker = ({
  selected,
  onSelect,
}: {
  selected: HairStyle;
  onSelect: (s: HairStyle) => void;
}) => (
  <View style={s.styleGrid}>
    {HAIR_STYLES.map(item => (
      <TouchableOpacity
        key={item.key}
        style={[s.styleCard, selected === item.key && s.styleCardActive]}
        onPress={() => onSelect(item.key)}
        activeOpacity={0.75}>
        <Text style={[s.styleLabel, selected === item.key && s.styleLabelActive]}>
          {item.label}
        </Text>
        <Text style={[s.styleDesc, selected === item.key && s.styleDescActive]}>
          {item.desc}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ── NumberPicker ─────────────────────────────────────────────────────────────

const NumberPicker = ({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (n: number) => void;
}) => (
  <View style={s.numberInputWrapper}>
    <TextInput
      style={s.numberInput}
      value={String(selected)}
      onChangeText={val => {
        const cleaned = val.replace(/[^0-9]/g, '').slice(0, 2);
        const num = parseInt(cleaned, 10);
        if (!isNaN(num) && num >= 0 && num <= 99) {onSelect(num);}
        else if (cleaned === '') {onSelect(0);}
      }}
      keyboardType="number-pad"
      maxLength={2}
      textAlign="center"
      placeholderTextColor={Colors.textMuted}
      selectionColor={Colors.primary}
    />
    <Text style={s.numberInputHint}>0 – 99 arası bir numara gir</Text>
  </View>
);

// ── Screen ────────────────────────────────────────────────────────────────────

const AvatarEditorScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [activeCategory, setActiveCategory] = useState<Category>('skin');
  const [avatarColors, setAvatarColors] = useState<AvatarColors>(DEFAULT_COLORS);
  const [initLoading, setInitLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewSize, setPreviewSize] = useState({width: 0, height: 0});

  const onPreviewLayout = (e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setPreviewSize({width, height});
  };

  useEffect(() => {
    getMyProfile().then(profile => {
      if (profile?.avatarConfig) {
        setAvatarColors(configToColors(profile.avatarConfig));
      }
      setInitLoading(false);
    });
  }, []);

  const update = (key: keyof AvatarColors, value: string | number | HairStyle) =>
    setAvatarColors(prev => ({...prev, [key]: value}));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({avatarConfig: colorsToConfig(avatarColors) as AvatarConfig});
      Alert.alert('Kaydedildi', 'Karakterin güncellendi.', [
        {text: 'Tamam', onPress: () => navigation.goBack()},
      ]);
    } catch {
      Alert.alert('Hata', 'Kaydedilemedi, tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  const activeCategory_ = CATEGORIES.find(c => c.key === activeCategory)!;

  const currentColors = (): string[] => {
    if (activeCategory === 'skin')   {return SKIN_TONES;}
    if (activeCategory === 'hair')   {return HAIR_COLORS;}
    if (activeCategory === 'eye')    {return EYE_COLORS;}
    if (activeCategory === 'jersey') {return JERSEY_COLORS;}
    if (activeCategory === 'shorts') {return SHORTS_COLORS;}
    return SHOES_COLORS;
  };

  const currentSelected = (): string => {
    if (activeCategory === 'skin')   {return avatarColors.skin;}
    if (activeCategory === 'hair')   {return avatarColors.hairColor;}
    if (activeCategory === 'eye')    {return avatarColors.eyeColor;}
    if (activeCategory === 'jersey') {return avatarColors.jerseyColor;}
    if (activeCategory === 'shorts') {return avatarColors.shortsColor;}
    return avatarColors.shoesColor;
  };

  const handleColorSelect = (c: string) => {
    if (activeCategory === 'skin')   {update('skin', c);}
    if (activeCategory === 'hair')   {update('hairColor', c);}
    if (activeCategory === 'eye')    {update('eyeColor', c);}
    if (activeCategory === 'jersey') {update('jerseyColor', c);}
    if (activeCategory === 'shorts') {update('shortsColor', c);}
    if (activeCategory === 'shoes')  {update('shoesColor', c);}
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

  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe} edges={['bottom']}>

        {/* ── Character preview ── */}
        <View style={s.preview} onLayout={onPreviewLayout}>
          <CourtBackground width={previewSize.width} height={previewSize.height} />
          <BasketbolcuAvatar colors={avatarColors} size={240} />
        </View>

        {/* ── Category tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.catScroll}
          contentContainerStyle={s.catRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[s.catBtn, activeCategory === cat.key && s.catBtnActive]}
              onPress={() => setActiveCategory(cat.key)}
              activeOpacity={0.8}>
              <Text style={[s.catLabel, activeCategory === cat.key && s.catLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Picker area ── */}
        <View style={s.paletteCard}>
          <Text style={s.paletteTitle}>
            {activeCategory_.label}{activeCategory_.type === 'color' ? ' Rengi Seç' : ' Seç'}
          </Text>

          {activeCategory_.type === 'style' ? (
            <StylePicker
              selected={avatarColors.hairStyle}
              onSelect={v => update('hairStyle', v)}
            />
          ) : activeCategory_.type === 'number' ? (
            <NumberPicker
              selected={avatarColors.jerseyNumber}
              onSelect={n => update('jerseyNumber', n)}
            />
          ) : (
            <ColorPicker
              colors={currentColors()}
              selected={currentSelected()}
              onSelect={handleColorSelect}
            />
          )}
        </View>

        {/* ── Save ── */}
        <View style={s.bottom}>
          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText}>Kaydet</Text>}
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe:   {flex: 1},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  // Preview
  preview: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  // Category tabs — compact
  catScroll: {flexGrow: 0, borderBottomWidth: 1, borderBottomColor: Colors.border},
  catRow: {flexDirection: 'row', paddingHorizontal: Spacing.sm, gap: 2},
  catBtn: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  catBtnActive: {borderBottomColor: Colors.primary},
  catLabel: {fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textMuted},
  catLabelActive: {color: Colors.primary},

  // Palette — compact, fixed height so it doesn't push preview
  paletteCard: {
    height: 110,
    padding: Spacing.md,
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  paletteTitle: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  colorRow: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm},
  colorDot: {width: 40, height: 40, borderRadius: 20},
  colorDotActive: {
    borderWidth: 3,
    borderColor: Colors.primary,
    transform: [{scale: 1.12}],
  },

  // Style picker — compact
  styleGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs},
  styleCard: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    minWidth: 78,
    alignItems: 'center',
    gap: 1,
  },
  styleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySubtle,
    ...Shadows.glow,
  },
  styleLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
  },
  styleLabelActive: {color: Colors.primary},
  styleDesc: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  styleDescActive: {color: Colors.primary, opacity: 0.7},

  // Number input
  numberInputWrapper: {alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xs},
  numberInput: {
    width: 110,
    height: 72,
    borderRadius: Radii.xl,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    fontSize: 38,
    fontWeight: Typography.black,
    textAlign: 'center',
    ...Shadows.glow,
  },
  numberInputHint: {fontSize: Typography.xs, color: Colors.textMuted},

  // Save
  bottom: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: 13,
    alignItems: 'center',
    ...Shadows.glow,
  },
  saveBtnDisabled: {opacity: 0.5},
  saveBtnText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},
});

export default AvatarEditorScreen;
