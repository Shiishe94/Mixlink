import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface NeonLineProps {
  startX: number;
  startY: number;
  angle: number;
  length: number;
  color: string[];
  delay: number;
  duration: number;
}

const NeonLine: React.FC<NeonLineProps> = ({
  startX,
  startY,
  angle,
  length,
  color,
  delay,
  duration,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0.1, 0.8, 0.1]);
    const translateX = interpolate(progress.value, [0, 1], [-50, 50]);
    const translateY = interpolate(progress.value, [0, 1], [-30, 30]);

    return {
      opacity,
      transform: [
        { translateX },
        { translateY },
        { rotate: `${angle}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.neonLine,
        {
          left: startX,
          top: startY,
          width: length,
        },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={color}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      />
    </Animated.View>
  );
};

interface NeonCircleProps {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
}

const NeonCircle: React.FC<NeonCircleProps> = ({ x, y, size, color, delay }) => {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1.5, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0.6, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.neonCircle,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          shadowColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

export const NeonBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const neonLines = [
    { startX: -50, startY: 100, angle: 25, length: 300, color: ['transparent', '#00FFFF', 'transparent'], delay: 0, duration: 6000 },
    { startX: width - 200, startY: 200, angle: -30, length: 250, color: ['transparent', '#FF00FF', 'transparent'], delay: 1000, duration: 5000 },
    { startX: 50, startY: height / 2, angle: 15, length: 200, color: ['transparent', '#FF1493', 'transparent'], delay: 2000, duration: 7000 },
    { startX: width - 150, startY: height / 2 + 100, angle: -20, length: 280, color: ['transparent', '#00FFFF', 'transparent'], delay: 500, duration: 5500 },
    { startX: -30, startY: height - 300, angle: 35, length: 220, color: ['transparent', '#39FF14', 'transparent'], delay: 1500, duration: 6500 },
    { startX: width - 100, startY: height - 200, angle: -15, length: 180, color: ['transparent', '#FF00FF', 'transparent'], delay: 2500, duration: 4500 },
    { startX: 100, startY: 50, angle: -10, length: 150, color: ['transparent', '#00FFFF', 'transparent'], delay: 3000, duration: 5000 },
    { startX: width / 2, startY: height - 400, angle: 45, length: 200, color: ['transparent', '#FF1493', 'transparent'], delay: 800, duration: 6000 },
  ];

  const neonCircles = [
    { x: 30, y: 150, size: 100, color: '#00FFFF', delay: 0 },
    { x: width - 80, y: 300, size: 60, color: '#FF00FF', delay: 1000 },
    { x: width / 2 - 40, y: height - 350, size: 80, color: '#FF1493', delay: 2000 },
    { x: 50, y: height / 2, size: 50, color: '#39FF14', delay: 1500 },
  ];

  return (
    <View style={styles.container}>
      {/* Dark gradient background */}
      <LinearGradient
        colors={['#0a0a0f', '#0d0d18', '#0a0a0f']}
        style={styles.background}
      />
      
      {/* Neon lines */}
      {neonLines.map((line, index) => (
        <NeonLine key={`line-${index}`} {...line} />
      ))}
      
      {/* Neon circles */}
      {neonCircles.map((circle, index) => (
        <NeonCircle key={`circle-${index}`} {...circle} />
      ))}
      
      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

// Simple static neon background for screens that don't need heavy animations
export const NeonBackgroundSimple: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a0f', '#0d0d18', '#0a0a0f']}
        style={styles.background}
      />
      <View style={[styles.staticLine, { top: 100, left: -50, transform: [{ rotate: '25deg' }] }]}>
        <LinearGradient
          colors={['transparent', '#00FFFF33', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </View>
      <View style={[styles.staticLine, { top: 300, right: -50, transform: [{ rotate: '-20deg' }] }]}>
        <LinearGradient
          colors={['transparent', '#FF00FF33', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </View>
      <View style={[styles.staticLine, { bottom: 200, left: 0, transform: [{ rotate: '15deg' }] }]}>
        <LinearGradient
          colors={['transparent', '#FF149333', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    zIndex: 10,
  },
  neonLine: {
    position: 'absolute',
    height: 2,
    zIndex: 1,
  },
  staticLine: {
    position: 'absolute',
    height: 2,
    width: 300,
    zIndex: 1,
  },
  gradient: {
    flex: 1,
    borderRadius: 1,
  },
  neonCircle: {
    position: 'absolute',
    borderWidth: 1,
    zIndex: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
});

// Neon color theme
export const NEON_COLORS = {
  background: '#0a0a0f',
  backgroundLight: '#12121a',
  card: '#1a1a25',
  cardBorder: '#2a2a3a',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  pink: '#FF1493',
  green: '#39FF14',
  purple: '#8B5CF6',
  primary: '#00FFFF',
  secondary: '#FF00FF',
  accent: '#FF1493',
  success: '#39FF14',
  warning: '#FFD700',
  error: '#FF4444',
  text: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#606070',
};
