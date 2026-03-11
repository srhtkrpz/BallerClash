import React, {useState} from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radii} from '../../constants/theme';

const TEAM_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#fbbf24'];

const CreateTeamScreen: React.FC = () => {
  const [teamName, setTeamName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!teamName.trim()) return;
    setLoading(true);
    // TODO: save to Supabase
    setLoading(false);
  };

  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Team logo preview */}
          <View style={s.logoPreview}>
            <View style={[s.logo, {backgroundColor: selectedColor}]}>
              <Text style={s.logoText}>{teamName.charAt(0).toUpperCase() || '?'}</Text>
            </View>
            <Text style={s.previewLabel}>Takım Logosu Önizleme</Text>
          </View>

          {/* Name */}
          <View style={s.field}>
            <Text style={s.label}>TAKIM ADI</Text>
            <TextInput
              style={s.input}
              placeholder="örn. Boğaziçi Ballers"
              placeholderTextColor={Colors.textMuted}
              value={teamName}
              onChangeText={setTeamName}
              maxLength={24}
            />
          </View>

          {/* Color picker */}
          <View style={s.field}>
            <Text style={s.label}>RENK</Text>
            <View style={s.colorRow}>
              {TEAM_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.colorDot, {backgroundColor: c}, selectedColor === c && s.colorDotActive]}
                  onPress={() => setSelectedColor(c)}
                  activeOpacity={0.8}
                />
              ))}
            </View>
          </View>

          {/* Info */}
          <View style={s.infoBox}>
            <Text style={s.infoText}>
              🏀 Takımını oluşturduktan sonra 3 oyuncuyu daha davet edebilirsin. Kaptan olarak sen atanırsın.
            </Text>
          </View>

          <TouchableOpacity
            style={[s.btn, !teamName.trim() && s.btnDisabled]}
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
  scroll: {padding: Spacing.lg, gap: Spacing.xl},
  logoPreview: {alignItems: 'center', gap: 8, paddingVertical: Spacing.md},
  logo: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: {fontSize: 40, fontWeight: Typography.black, color: '#fff'},
  previewLabel: {fontSize: Typography.xs, color: Colors.textMuted},
  field: {gap: Spacing.sm},
  label: {fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textMuted, letterSpacing: 1.2},
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: Typography.base,
  },
  colorRow: {flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap'},
  colorDot: {width: 38, height: 38, borderRadius: 19},
  colorDotActive: {borderWidth: 3, borderColor: '#fff'},
  infoBox: {
    backgroundColor: Colors.primarySubtle,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    padding: Spacing.md,
  },
  infoText: {fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20},
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: {opacity: 0.4},
  btnText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},
});

export default CreateTeamScreen;
