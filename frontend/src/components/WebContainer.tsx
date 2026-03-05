import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { NEON_COLORS } from './NeonBackground';

interface WebContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  fullHeight?: boolean;
}

/**
 * Responsive container that centers and constrains content on web/desktop.
 * On mobile: full width.
 * On desktop (>768px): centered with max-width.
 */
export const WebContainer: React.FC<WebContainerProps> = ({
  children,
  maxWidth = 480,
  fullHeight = true,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.desktopOuter, fullHeight && { flex: 1 }]}>
      <View style={[styles.desktopInner, { maxWidth }, fullHeight && { flex: 1 }]}>
        {children}
      </View>
    </View>
  );
};

/**
 * Wider container for content-heavy pages (home, search, bookings etc.)
 */
export const WebContainerWide: React.FC<WebContainerProps> = ({
  children,
  maxWidth = 1024,
  fullHeight = true,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.desktopOuter, fullHeight && { flex: 1 }]}>
      <View style={[styles.desktopInner, { maxWidth }, fullHeight && { flex: 1 }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  desktopOuter: {
    backgroundColor: NEON_COLORS.background,
    alignItems: 'center',
    width: '100%',
  },
  desktopInner: {
    width: '100%',
    backgroundColor: NEON_COLORS.background,
    // Subtle side borders on desktop
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 5,
  },
});
