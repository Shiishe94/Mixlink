import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { NEON_COLORS } from '../../src/components/NeonBackground';

export default function TabsLayout() {
  const { user } = useAuthStore();
  const isDJ = user?.user_type === 'dj';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: NEON_COLORS.backgroundLight,
          borderTopColor: NEON_COLORS.cardBorder,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: NEON_COLORS.cyan,
        tabBarInactiveTintColor: NEON_COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : undefined}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
              {focused && <View style={[styles.glow, { shadowColor: color }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: isDJ ? 'Événements' : 'DJs',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : undefined}>
              <Ionicons name={focused ? 'search' : 'search-outline'} size={24} color={color} />
              {focused && <View style={[styles.glow, { shadowColor: color }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Réservations',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : undefined}>
              <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
              {focused && <View style={[styles.glow, { shadowColor: color }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : undefined}>
              <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} />
              {focused && <View style={[styles.glow, { shadowColor: color }]} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : undefined}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
              {focused && <View style={[styles.glow, { shadowColor: color }]} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 0,
  },
});
