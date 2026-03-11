import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radii} from '../../constants/theme';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {TeamsStackParamList} from '../../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<TeamsStackParamList, 'TeamsMain'>;

const TeamsScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>Takımlar</Text>
          <TouchableOpacity
            style={s.createBtn}
            onPress={() => navigation.navigate('CreateTeam')}
            activeOpacity={0.8}>
            <Text style={s.createBtnText}>+ Takım Kur</Text>
          </TouchableOpacity>
        </View>

        <View style={s.center}>
          <Text style={s.emptyIcon}>🏀</Text>
          <Text style={s.emptyTitle}>Takımın yok</Text>
          <Text style={s.emptySub}>Bir takım kur veya daveti bekle.</Text>
          <TouchableOpacity
            style={s.cta}
            onPress={() => navigation.navigate('CreateTeam')}
            activeOpacity={0.85}>
            <Text style={s.ctaText}>Takım Kur</Text>
          </TouchableOpacity>
        </View>
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
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: Spacing.xl},
  emptyIcon: {fontSize: 52},
  emptyTitle: {fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary},
  emptySub: {fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center'},
  cta: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 13,
    borderRadius: Radii.lg,
    marginTop: 4,
  },
  ctaText: {color: '#fff', fontSize: Typography.base, fontWeight: Typography.bold},
});

export default TeamsScreen;
