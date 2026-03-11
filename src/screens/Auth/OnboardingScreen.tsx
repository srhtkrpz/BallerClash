import React, {useState} from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radii} from '../../constants/theme';
import type {City, PlayerPosition} from '../../types/models';

const CITIES: {key: City; label: string}[] = [
  {key: 'istanbul', label: 'İstanbul'},
  {key: 'ankara', label: 'Ankara'},
  {key: 'izmir', label: 'İzmir'},
];

const POSITIONS: {key: PlayerPosition; label: string; desc: string}[] = [
  {key: 'PG', label: 'PG', desc: 'Playmaker'},
  {key: 'SG', label: 'SG', desc: 'Şutör'},
  {key: 'SF', label: 'SF', desc: 'Small Forward'},
  {key: 'PF', label: 'PF', desc: 'Power Forward'},
  {key: 'C',  label: 'C',  desc: 'Pivot'},
];

const OnboardingScreen: React.FC = () => {
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState('');
  const [instagram, setInstagram] = useState('');
  const [city, setCity] = useState<City>('istanbul');
  const [position, setPosition] = useState<PlayerPosition>('PG');
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setLoading(true);
    // TODO: save profile to Supabase
    setLoading(false);
  };

  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe}>
        {/* Progress */}
        <View style={s.progress}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.dot, step >= i && s.dotActive]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {step === 0 && (
            <View style={s.step}>
              <Text style={s.stepEmoji}>👤</Text>
              <Text style={s.stepTitle}>Kullanıcı Adın</Text>
              <Text style={s.stepSub}>Sahalarda bu isimle tanınacaksın.</Text>
              <TextInput
                style={s.input}
                placeholder="kullanici_adi"
                placeholderTextColor={Colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                maxLength={20}
              />
              <TextInput
                style={s.input}
                placeholder="Instagram kullanıcı adı (opsiyonel)"
                placeholderTextColor={Colors.textMuted}
                value={instagram}
                onChangeText={setInstagram}
                autoCapitalize="none"
              />
            </View>
          )}

          {step === 1 && (
            <View style={s.step}>
              <Text style={s.stepEmoji}>📍</Text>
              <Text style={s.stepTitle}>Şehrin</Text>
              <Text style={s.stepSub}>Bölgesel sıralamada yer almak için şehrini seç.</Text>
              <View style={s.options}>
                {CITIES.map(c => (
                  <TouchableOpacity
                    key={c.key}
                    style={[s.option, city === c.key && s.optionActive]}
                    onPress={() => setCity(c.key)}
                    activeOpacity={0.8}>
                    <Text style={[s.optionText, city === c.key && s.optionTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={s.step}>
              <Text style={s.stepEmoji}>⛹️</Text>
              <Text style={s.stepTitle}>Pozisyonun</Text>
              <Text style={s.stepSub}>Sahadaki rolünü seç.</Text>
              <View style={s.options}>
                {POSITIONS.map(p => (
                  <TouchableOpacity
                    key={p.key}
                    style={[s.posOption, position === p.key && s.optionActive]}
                    onPress={() => setPosition(p.key)}
                    activeOpacity={0.8}>
                    <Text style={[s.posLabel, position === p.key && s.optionTextActive]}>{p.label}</Text>
                    <Text style={[s.posDesc, position === p.key && {color: Colors.primaryLight}]}>{p.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

        </ScrollView>

        {/* Bottom CTA */}
        <View style={s.bottom}>
          {step < 2 ? (
            <TouchableOpacity
              style={[s.btn, !username && step === 0 && s.btnDisabled]}
              onPress={() => setStep(s => s + 1)}
              disabled={step === 0 && !username}
              activeOpacity={0.85}>
              <Text style={s.btnText}>Devam →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.btn} onPress={handleFinish} activeOpacity={0.85} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Sahaya Çık 🏀</Text>}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  progress: {flexDirection: 'row', gap: 8, justifyContent: 'center', paddingTop: Spacing.lg},
  dot: {width: 28, height: 4, borderRadius: 2, backgroundColor: Colors.border},
  dotActive: {backgroundColor: Colors.primary},
  scroll: {flexGrow: 1, paddingHorizontal: Spacing.xl},
  step: {paddingTop: Spacing.xxxl, gap: Spacing.md},
  stepEmoji: {fontSize: 52},
  stepTitle: {fontSize: Typography.xxl, fontWeight: Typography.black, color: Colors.textPrimary, letterSpacing: -0.5},
  stepSub: {fontSize: Typography.base, color: Colors.textSecondary, lineHeight: 22},
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
  options: {gap: Spacing.sm, marginTop: Spacing.sm},
  option: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  posOption: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  optionActive: {borderColor: Colors.primary, backgroundColor: Colors.primarySubtle},
  optionText: {fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textSecondary},
  optionTextActive: {color: Colors.primary},
  posLabel: {fontSize: Typography.base, fontWeight: Typography.black, color: Colors.textSecondary, width: 32},
  posDesc: {fontSize: Typography.sm, color: Colors.textMuted},
  bottom: {padding: Spacing.xl, paddingBottom: Spacing.xxl},
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: {opacity: 0.4},
  btnText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},
});

export default OnboardingScreen;
