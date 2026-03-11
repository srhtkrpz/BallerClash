import React from 'react';
import {View, Text, ActivityIndicator, Platform} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Colors, Typography} from '../constants/theme';
import {AuthProvider, useAuth} from '../context/AuthContext';

// Screens
import AuthScreen from '../screens/Auth/AuthScreen';
import OnboardingScreen from '../screens/Auth/OnboardingScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import AvatarEditorScreen from '../screens/Avatar/AvatarEditorScreen';
import TeamsScreen from '../screens/Teams/TeamsScreen';
import CreateTeamScreen from '../screens/Teams/CreateTeamScreen';
import MatchScreen from '../screens/Match/MatchScreen';
import MatchDetailScreen from '../screens/Match/MatchDetailScreen';
import PostMatchScreen from '../screens/Match/PostMatchScreen';
import CreateMatchScreen from '../screens/Match/CreateMatchScreen';
import LeaderboardScreen from '../screens/Leaderboard/LeaderboardScreen';
import MapScreen from '../screens/Map/MapScreen';

// ── Param lists ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  CreateMatch: undefined;
  MatchDetail: {matchId: string};
  PostMatch: {matchId: string};
  AvatarEditor: undefined;
};

export type TeamsStackParamList = {
  TeamsMain: undefined;
  CreateTeam: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  TeamsTab: undefined;
  MapTab: undefined;
  LeaderboardTab: undefined;
  ProfileTab: undefined;
};

// ── Stacks ───────────────────────────────────────────────────────────────────

const Root = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const TeamsStack = createNativeStackNavigator<TeamsStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const stackOptions = {
  headerStyle: {backgroundColor: Colors.surface},
  headerTintColor: Colors.textPrimary,
  headerTitleStyle: {fontWeight: Typography.bold, fontSize: Typography.md, color: Colors.textPrimary},
  headerShadowVisible: false,
  contentStyle: {backgroundColor: Colors.background},
  animation: 'slide_from_right' as const,
};

const TabIcon = ({icon, color}: {icon: string; color: string}) => (
  <Text style={{fontSize: 22, color}}>{icon}</Text>
);

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackOptions}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{headerShown: false}} />
      <HomeStack.Screen name="CreateMatch" component={CreateMatchScreen} options={{headerShown: false}} />
      <HomeStack.Screen name="MatchDetail" component={MatchDetailScreen} options={{title: 'Maç Detayı'}} />
      <HomeStack.Screen name="PostMatch" component={PostMatchScreen} options={{title: 'Maç Sonu', headerShown: false}} />
      <HomeStack.Screen name="AvatarEditor" component={AvatarEditorScreen} options={{title: 'Avatar Düzenle'}} />
    </HomeStack.Navigator>
  );
}

function TeamsStackNavigator() {
  return (
    <TeamsStack.Navigator screenOptions={stackOptions}>
      <TeamsStack.Screen name="TeamsMain" component={TeamsScreen} options={{headerShown: false}} />
      <TeamsStack.Screen name="CreateTeam" component={CreateTeamScreen} options={{title: 'Takım Kur'}} />
    </TeamsStack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.navBackground,
          borderTopWidth: 1,
          borderTopColor: Colors.navBorder,
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: {fontSize: 10, fontWeight: Typography.semibold, marginTop: 2, letterSpacing: 0.3},
        tabBarActiveTintColor: Colors.navIconActive,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
        tabBarItemStyle: {paddingBottom: Platform.OS === 'ios' ? 14 : 6},
      }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{tabBarLabel: 'Maçlar', tabBarIcon: ({color}) => <TabIcon icon="⛹" color={color} />}}
      />
      <Tab.Screen
        name="TeamsTab"
        component={TeamsStackNavigator}
        options={{tabBarLabel: 'Takımlar', tabBarIcon: ({color}) => <TabIcon icon="🏀" color={color} />}}
      />
      <Tab.Screen
        name="MapTab"
        component={MapScreen}
        options={{tabBarLabel: 'Sahalar', tabBarIcon: ({color}) => <TabIcon icon="📍" color={color} />}}
      />
      <Tab.Screen
        name="LeaderboardTab"
        component={LeaderboardScreen}
        options={{tabBarLabel: 'Sıralama', tabBarIcon: ({color}) => <TabIcon icon="🏆" color={color} />}}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{tabBarLabel: 'Profil', tabBarIcon: ({color}) => <TabIcon icon="👤" color={color} />}}
      />
    </Tab.Navigator>
  );
}

// ── Root Navigator ───────────────────────────────────────────────────────────

const RootNavigator: React.FC = () => {
  const {session, loading} = useAuth();

  if (loading) {
    return (
      <View style={{flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <Root.Navigator screenOptions={{headerShown: false}}>
        <Root.Screen name="Auth" component={AuthScreen} />
        <Root.Screen name="Onboarding" component={OnboardingScreen} />
      </Root.Navigator>
    );
  }

  return (
    <Root.Navigator screenOptions={{headerShown: false}}>
      <Root.Screen name="Main" component={MainTabNavigator} />
    </Root.Navigator>
  );
};

const AppNavigator: React.FC = () => (
  <AuthProvider>
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  </AuthProvider>
);

export default AppNavigator;
