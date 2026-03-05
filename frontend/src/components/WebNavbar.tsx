import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import { router, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../store/authStore';
import { NEON_COLORS } from './NeonBackground';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_81ff48f5-d5df-4c9e-b7e3-186c0149c723/artifacts/d9apiwuf_A93D7E82-3928-43DA-B03F-A012568E9B90.png';

interface NavItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  segment: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Accueil', icon: 'home', route: '/(tabs)', segment: '(tabs)' },
  { label: 'DJs', icon: 'search', route: '/(tabs)/search', segment: 'search' },
  { label: 'Réservations', icon: 'calendar', route: '/(tabs)/bookings', segment: 'bookings' },
  { label: 'Messages', icon: 'chatbubbles', route: '/(tabs)/messages', segment: 'messages' },
];

export const WebNavbar: React.FC = () => {
  const { width } = useWindowDimensions();
  const { user, isAuthenticated, logout } = useAuthStore();
  const segments = useSegments();
  const isDesktop = Platform.OS === 'web' && width > 768;
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const currentSegment = segments[1] || segments[0] || '';

  if (!isDesktop || !isAuthenticated) return null;

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.navbar}>
      <View style={styles.navContent}>
        {/* Logo */}
        <TouchableOpacity
          style={styles.logoContainer}
          onPress={() => router.push('/(tabs)')}
        >
          <Image source={{ uri: LOGO_URL }} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.logoText}>DJ Booking</Text>
        </TouchableOpacity>

        {/* Nav Links */}
        <View style={styles.navLinks}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              currentSegment === item.segment ||
              (item.segment === '(tabs)' && (currentSegment === 'index' || currentSegment === ''));

            return (
              <TouchableOpacity
                key={item.route}
                style={[styles.navLink, isActive && styles.navLinkActive]}
                onPress={() => router.push(item.route as any)}
              >
                <Ionicons
                  name={isActive ? item.icon : (`${item.icon}-outline` as any)}
                  size={18}
                  color={isActive ? NEON_COLORS.cyan : NEON_COLORS.textSecondary}
                />
                <Text style={[styles.navLinkText, isActive && styles.navLinkTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* User Menu */}
        <View style={styles.userSection}>
          <TouchableOpacity
            style={styles.userButton}
            onPress={() => setShowUserMenu(!showUserMenu)}
          >
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={16} color="#fff" />
            </View>
            <Text style={styles.userName}>{user?.first_name || 'Profil'}</Text>
            <Ionicons name="chevron-down" size={14} color={NEON_COLORS.textSecondary} />
          </TouchableOpacity>

          {showUserMenu && (
            <View style={styles.dropdown}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowUserMenu(false);
                  router.push('/(tabs)/profile');
                }}
              >
                <Ionicons name="person-outline" size={18} color={NEON_COLORS.textSecondary} />
                <Text style={styles.dropdownText}>Mon profil</Text>
              </TouchableOpacity>

              {user?.user_type === 'dj' && (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowUserMenu(false);
                    router.push('/dj/wallet');
                  }}
                >
                  <Ionicons name="wallet-outline" size={18} color={NEON_COLORS.textSecondary} />
                  <Text style={styles.dropdownText}>Mon portefeuille</Text>
                </TouchableOpacity>
              )}

              {user?.email === 'admin@djbooking.com' && (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowUserMenu(false);
                    router.push('/admin');
                  }}
                >
                  <Ionicons name="settings-outline" size={18} color={NEON_COLORS.textSecondary} />
                  <Text style={styles.dropdownText}>Administration</Text>
                </TouchableOpacity>
              )}

              <View style={styles.dropdownDivider} />

              <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color="#FF4444" />
                <Text style={[styles.dropdownText, { color: '#FF4444' }]}>Déconnexion</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    backgroundColor: NEON_COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.08)',
    paddingHorizontal: 24,
    paddingVertical: 0,
    zIndex: 100,
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    height: 64,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  navLinkActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.08)',
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: NEON_COLORS.textSecondary,
  },
  navLinkTextActive: {
    color: NEON_COLORS.cyan,
    fontWeight: '600',
  },
  userSection: {
    position: 'relative',
  },
  userButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NEON_COLORS.magenta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: NEON_COLORS.card,
    borderRadius: 14,
    padding: 8,
    minWidth: 200,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 999,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  dropdownText: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 4,
  },
});
