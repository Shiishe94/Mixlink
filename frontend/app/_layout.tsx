import React, { useEffect } from 'react';
import { Stack, router, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useAuthStore } from '../src/store/authStore';
import { NEON_COLORS } from '../src/components/NeonBackground';
import { WebNavbar } from '../src/components/WebNavbar';

export default function RootLayout() {
  const { isLoading, isAuthenticated, loadUser } = useAuthStore();
  const segments = useSegments();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    // Allow public routes without authentication (check both segments and pathname)
    const isPublicRoute = segments[0] === 'verify-email' || 
                          pathname.startsWith('/verify-email') ||
                          (segments[0] === 'payment' && segments[1] === 'feature-success') ||
                          pathname.startsWith('/payment/feature-success');

    if (!isAuthenticated && !inAuthGroup && !isPublicRoute) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, pathname, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NEON_COLORS.cyan} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <View style={styles.outerContainer}>
        <WebNavbar />
        <View style={styles.innerContainer}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: NEON_COLORS.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="dj/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="event/create" options={{ headerShown: false }} />
            <Stack.Screen name="booking/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="messages/[partnerId]" options={{ headerShown: false }} />
            <Stack.Screen name="admin/index" options={{ headerShown: false }} />
            <Stack.Screen name="dj/wallet" options={{ headerShown: false }} />
            <Stack.Screen name="dj/withdrawal" options={{ headerShown: false }} />
            <Stack.Screen name="payment/checkout" options={{ headerShown: false }} />
            <Stack.Screen name="payment/success" options={{ headerShown: false }} />
            <Stack.Screen name="payment/cancel" options={{ headerShown: false }} />
            <Stack.Screen name="payment/feature-success" options={{ headerShown: false }} />
            <Stack.Screen name="verify-email" options={{ headerShown: false }} />
          </Stack>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: NEON_COLORS.background,
  },
  innerContainer: {
    flex: 1,
    backgroundColor: NEON_COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: NEON_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
