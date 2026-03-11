import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radii} from '../../constants/theme';

const PostMatchScreen: React.FC = () => {
  return (
    <View style={s.screen}>
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.placeholder}>Maç Sonu & Reyting — yakında</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  safe: {flex: 1},
  scroll: {flexGrow: 1, padding: Spacing.lg},
  placeholder: {color: Colors.textMuted, textAlign: 'center', marginTop: 40},
});

export default PostMatchScreen;
