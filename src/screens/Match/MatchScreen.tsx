import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors, Spacing} from '../../constants/theme';

const MatchScreen: React.FC = () => (
  <View style={s.screen}>
    <Text style={s.text}>Maç ekranı</Text>
  </View>
);

const s = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center'},
  text: {color: Colors.textMuted},
});

export default MatchScreen;
