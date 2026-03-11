import React, {useState} from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import {Colors, Typography, Spacing, Radii} from '../../constants/theme';
import {supabase} from '../../services/supabase/client';

const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    if (!email || !password) {setError('Email ve şifre gerekli.'); return;}
    setLoading(true);
    setError('');
    try {
      if (mode === 'signup') {
        const {error: e} = await supabase.auth.signUp({email, password});
        if (e) throw e;
      } else {
        const {error: e} = await supabase.auth.signInWithPassword({email, password});
        if (e) throw e;
      }
    } catch (e: any) {
      setError(e.message ?? 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.screen}>
      <LinearGradient
        colors={['#1a0a00', Colors.background]}
        style={StyleSheet.absoluteFill}
        start={{x: 0.5, y: 0}}
        end={{x: 0.5, y: 0.6}}
      />

      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          style={s.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

            {/* Logo / Brand */}
            <View style={s.brand}>
              <Text style={s.ball}>🏀</Text>
              <Text style={s.appName}>BallerClash</Text>
              <Text style={s.tagline}>Sokak basketbolu{'\n'}yeni bir seviyeye taşındı.</Text>
            </View>

            {/* Form */}
            <View style={s.form}>
              {error ? <Text style={s.errorText}>{error}</Text> : null}

              <TextInput
                style={s.input}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={s.input}
                placeholder="Şifre"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={s.btn}
                onPress={handleAuth}
                activeOpacity={0.85}
                disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>{mode === 'signin' ? 'Giriş Yap' : 'Hesap Oluştur'}</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setMode(m => m === 'signin' ? 'signup' : 'signin')}>
                <Text style={s.switchText}>
                  {mode === 'signin'
                    ? 'Hesabın yok mu? Kayıt ol'
                    : 'Zaten hesabın var mı? Giriş yap'}
                </Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  kav: {flex: 1},
  scroll: {flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxxl},
  brand: {alignItems: 'center', marginBottom: Spacing.xxxl},
  ball: {fontSize: 64, marginBottom: Spacing.md},
  appName: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  form: {gap: Spacing.md},
  errorText: {
    color: Colors.error,
    fontSize: Typography.sm,
    textAlign: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
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
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnText: {
    color: '#fff',
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  switchText: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

export default AuthScreen;
