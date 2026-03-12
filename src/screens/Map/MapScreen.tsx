import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import * as Location from 'expo-location';
import {Colors, Typography, Spacing, Radii} from '../../constants/theme';
import type {Court} from '../../types/models';

// Placeholder courts — replace with Supabase fetch
const DEMO_COURTS: Court[] = [
  {id: '1', name: 'Caddebostan Sahası', address: 'Caddebostan, İstanbul', city: 'istanbul', latitude: 40.9597, longitude: 29.0699, isIndoor: false, activePlayers: 6, createdAt: ''},
  {id: '2', name: 'Altunizade Park', address: 'Altunizade, İstanbul', city: 'istanbul', latitude: 41.0199, longitude: 29.0535, isIndoor: false, activePlayers: 2, createdAt: ''},
];

const MapScreen: React.FC = () => {
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {status} = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }

      // 1) Hemen bilinen son konumu göster (gecikmesiz)
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last && !cancelled) {
          setLocation({latitude: last.coords.latitude, longitude: last.coords.longitude});
          setLoading(false);
        }
      } catch {}

      // 2) Gerçek GPS konumunu al ve güncelle
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setLocation({latitude: loc.coords.latitude, longitude: loc.coords.longitude});
        }
      } catch {}

      if (!cancelled) {setLoading(false);}
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <View style={ms.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const region = location
    ? {latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08}
    : {latitude: 41.015137, longitude: 28.979530, latitudeDelta: 0.15, longitudeDelta: 0.15};

  return (
    <View style={ms.screen}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        region={region}
        showsUserLocation
        showsMyLocationButton
        customMapStyle={darkMapStyle}>

        {DEMO_COURTS.map(court => (
          <Marker
            key={court.id}
            coordinate={{latitude: court.latitude, longitude: court.longitude}}
            onPress={() => setSelectedCourt(court)}>
            <View style={[ms.markerPin, court.activePlayers && court.activePlayers > 4 ? ms.markerHot : {}]}>
              <Text style={ms.markerText}>🏀</Text>
              {court.activePlayers ? (
                <View style={ms.markerBadge}>
                  <Text style={ms.markerBadgeText}>{court.activePlayers}</Text>
                </View>
              ) : null}
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Header overlay */}
      <SafeAreaView style={ms.overlay} edges={['top']}>
        <View style={ms.headerCard}>
          <Text style={ms.headerTitle}>🗺️ Sahalar</Text>
          <Text style={ms.headerSub}>{DEMO_COURTS.length} saha</Text>
        </View>
      </SafeAreaView>

      {/* Court detail bottom sheet */}
      {selectedCourt && (
        <View style={ms.bottomSheet}>
          <View style={ms.handle} />
          <Text style={ms.courtName}>{selectedCourt.name}</Text>
          <Text style={ms.courtAddress}>📍 {selectedCourt.address}</Text>
          <View style={ms.courtMeta}>
            <View style={ms.metaBadge}>
              <Text style={ms.metaText}>
                {selectedCourt.isIndoor ? '🏠 Kapalı' : '☀️ Açık'}
              </Text>
            </View>
            {selectedCourt.activePlayers ? (
              <View style={[ms.metaBadge, ms.metaBadgeOrange]}>
                <Text style={[ms.metaText, {color: Colors.primary}]}>
                  ⛹️ {selectedCourt.activePlayers} oyuncu aktif
                </Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={ms.closeBtn} onPress={() => setSelectedCourt(null)}>
            <Text style={ms.closeBtnText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const ms = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background},
  overlay: {position: 'absolute', top: 0, left: 0, right: 0},
  headerCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(13,13,15,0.85)',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {fontSize: Typography.base, fontWeight: Typography.heavy, color: Colors.textPrimary},
  headerSub: {fontSize: Typography.xs, color: Colors.textMuted},
  markerPin: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 6,
    alignItems: 'center',
  },
  markerHot: {borderColor: Colors.primary, backgroundColor: Colors.primarySubtle},
  markerText: {fontSize: 20},
  markerBadge: {
    position: 'absolute',
    top: -4, right: -4,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    width: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  markerBadgeText: {fontSize: 9, fontWeight: Typography.black, color: '#fff'},
  bottomSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm,
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  courtName: {fontSize: Typography.xl, fontWeight: Typography.heavy, color: Colors.textPrimary},
  courtAddress: {fontSize: Typography.sm, color: Colors.textMuted},
  courtMeta: {flexDirection: 'row', gap: Spacing.sm, marginTop: 4},
  metaBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metaBadgeOrange: {borderColor: Colors.primaryGlow, backgroundColor: Colors.primarySubtle},
  metaText: {fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.semibold},
  closeBtn: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeBtnText: {color: Colors.textMuted, fontSize: Typography.sm},
});

const darkMapStyle = [
  {elementType: 'geometry', stylers: [{color: '#1a1a2e'}]},
  {elementType: 'labels.text.fill', stylers: [{color: '#746855'}]},
  {elementType: 'labels.text.stroke', stylers: [{color: '#242f3e'}]},
  {featureType: 'road', elementType: 'geometry', stylers: [{color: '#2c2c3e'}]},
  {featureType: 'road', elementType: 'geometry.stroke', stylers: [{color: '#212a37'}]},
  {featureType: 'road.highway', elementType: 'geometry', stylers: [{color: '#3c3c5a'}]},
  {featureType: 'water', elementType: 'geometry', stylers: [{color: '#0d1b2a'}]},
  {featureType: 'poi.park', elementType: 'geometry', stylers: [{color: '#1a2e1a'}]},
];

export default MapScreen;
