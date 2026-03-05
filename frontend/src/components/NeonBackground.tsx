import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  runOnJS,
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
  type?: 'line' | 'electric';
}

const NeonLine: React.FC<NeonLineProps> = ({
  startX,
  startY,
  angle,
  length,
  color,
  delay,
  duration,
  type = 'line',
}) => {
  const progress = useSharedValue(0);
  const electricFlash = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );

    if (type === 'electric') {
      electricFlash.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 100, easing: Easing.out(Easing.exp) }),
            withTiming(0, { duration: 50 }),
            withTiming(0.8, { duration: 80 }),
            withTiming(0, { duration: 300 }),
            withTiming(0, { duration: 2000 })
          ),
          -1,
          false
        )
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const baseOpacity = interpolate(progress.value, [0, 0.5, 1], [0.1, 0.8, 0.1]);
    const flashOpacity = type === 'electric' ? electricFlash.value : 0;
    const opacity = Math.max(baseOpacity, flashOpacity);
    
    const translateX = interpolate(progress.value, [0, 1], [-50, 50]);
    const translateY = interpolate(progress.value, [0, 1], [-30, 30]);
    const scale = type === 'electric' ? interpolate(electricFlash.value, [0, 1], [1, 1.2]) : 1;

    return {
      opacity,
      transform: [
        { translateX },
        { translateY },
        { rotate: `${angle}deg` },
        { scaleX: scale },
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
          height: type === 'electric' ? 3 : 2,
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

interface ElectricBoltProps {
  startX: number;
  startY: number;
  color: string;
  delay: number;
}

const ElectricBolt: React.FC<ElectricBoltProps> = ({ startX, startY, color, delay }) => {
  const flash = useSharedValue(0);
  const pathOffset = useSharedValue(0);

  useEffect(() => {
    flash.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 50 }),
          withTiming(0.3, { duration: 30 }),
          withTiming(1, { duration: 40 }),
          withTiming(0, { duration: 100 }),
          withTiming(0, { duration: 3000 + Math.random() * 2000 })
        ),
        -1,
        false
      )
    );
    
    pathOffset.value = withRepeat(
      withTiming(1, { duration: 200 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: flash.value,
    transform: [
      { translateX: interpolate(pathOffset.value, [0, 1], [-2, 2]) },
    ],
  }));

  // Create a zigzag path for the bolt
  const boltPath = (
    <Animated.View style={[styles.boltContainer, { left: startX, top: startY }, animatedStyle]}>
      <View style={[styles.boltSegment, { backgroundColor: color, transform: [{ rotate: '60deg' }] }]} />
      <View style={[styles.boltSegment, { backgroundColor: color, transform: [{ rotate: '-60deg' }], left: 15, top: 20 }]} />
      <View style={[styles.boltSegment, { backgroundColor: color, transform: [{ rotate: '60deg' }], left: 30, top: 40 }]} />
    </Animated.View>
  );

  return boltPath;
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

// Glowing Orb component
const GlowingOrb: React.FC<{ x: number; y: number; size: number; color: string; delay: number }> = ({
  x, y, size, color, delay
}) => {
  const pulse = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
    
    float.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.2, 0.5]),
    transform: [
      { translateY: interpolate(float.value, [0, 1], [0, -20]) },
      { scale: interpolate(pulse.value, [0, 1], [0.9, 1.1]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.glowingOrb,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '20',
          shadowColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

export const NeonBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const neonLines = [
    { startX: -50, startY: 100, angle: 25, length: 300, color: ['transparent', '#00FFFF', 'transparent'], delay: 0, duration: 6000, type: 'line' as const },
    { startX: width - 200, startY: 200, angle: -30, length: 250, color: ['transparent', '#FF00FF', 'transparent'], delay: 1000, duration: 5000, type: 'electric' as const },
    { startX: 50, startY: height / 2, angle: 15, length: 200, color: ['transparent', '#FF1493', 'transparent'], delay: 2000, duration: 7000, type: 'line' as const },
    { startX: width - 150, startY: height / 2 + 100, angle: -20, length: 280, color: ['transparent', '#00FFFF', 'transparent'], delay: 500, duration: 5500, type: 'electric' as const },
    { startX: -30, startY: height - 300, angle: 35, length: 220, color: ['transparent', '#39FF14', 'transparent'], delay: 1500, duration: 6500, type: 'line' as const },
    { startX: width - 100, startY: height - 200, angle: -15, length: 180, color: ['transparent', '#FF00FF', 'transparent'], delay: 2500, duration: 4500, type: 'electric' as const },
    { startX: 100, startY: 50, angle: -10, length: 150, color: ['transparent', '#00FFFF', 'transparent'], delay: 3000, duration: 5000, type: 'line' as const },
    { startX: width / 2, startY: height - 400, angle: 45, length: 200, color: ['transparent', '#FF1493', 'transparent'], delay: 800, duration: 6000, type: 'electric' as const },
    // Additional electric lines
    { startX: width * 0.3, startY: 150, angle: -45, length: 180, color: ['transparent', '#9D4EDD', 'transparent'], delay: 1200, duration: 4000, type: 'electric' as const },
    { startX: width * 0.7, startY: height * 0.4, angle: 30, length: 220, color: ['transparent', '#00D4FF', 'transparent'], delay: 1800, duration: 4500, type: 'electric' as const },
  ];

  const neonCircles = [
    { x: 30, y: 150, size: 100, color: '#00FFFF', delay: 0 },
    { x: width - 80, y: 300, size: 60, color: '#FF00FF', delay: 1000 },
    { x: width / 2 - 40, y: height - 350, size: 80, color: '#FF1493', delay: 2000 },
    { x: 50, y: height / 2, size: 50, color: '#39FF14', delay: 1500 },
  ];

  const glowingOrbs = [
    { x: '10%', y: '15%', size: 200, color: '#00FFFF', delay: 0 },
    { x: '70%', y: '30%', size: 150, color: '#FF00FF', delay: 1500 },
    { x: '30%', y: '70%', size: 180, color: '#9D4EDD', delay: 3000 },
    { x: '80%', y: '80%', size: 120, color: '#00D4FF', delay: 2000 },
  ];

  const electricBolts = [
    { startX: width * 0.2, startY: height * 0.3, color: '#00FFFF', delay: 2000 },
    { startX: width * 0.8, startY: height * 0.5, color: '#FF00FF', delay: 4000 },
    { startX: width * 0.5, startY: height * 0.2, color: '#39FF14', delay: 6000 },
  ];

  return (
    <View style={styles.container}>
      {/* Dark gradient background */}
      <LinearGradient
        colors={['#0a0a0f', '#0d0d18', '#0a0a0f']}
        style={styles.background}
      />
      
      {/* Glowing Orbs */}
      {glowingOrbs.map((orb, index) => (
        <GlowingOrb
          key={`orb-${index}`}
          x={typeof orb.x === 'string' ? parseFloat(orb.x) / 100 * width : orb.x}
          y={typeof orb.y === 'string' ? parseFloat(orb.y) / 100 * height : orb.y}
          size={orb.size}
          color={orb.color}
          delay={orb.delay}
        />
      ))}
      
      {/* Neon lines */}
      {neonLines.map((line, index) => (
        <NeonLine key={`line-${index}`} {...line} />
      ))}
      
      {/* Electric bolts */}
      {electricBolts.map((bolt, index) => (
        <ElectricBolt key={`bolt-${index}`} {...bolt} />
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
      {/* Static glowing orbs */}
      <View style={[styles.staticOrb, { left: '10%', top: '15%', backgroundColor: '#00FFFF15' }]} />
      <View style={[styles.staticOrb, { right: '15%', top: '40%', backgroundColor: '#FF00FF10', width: 150, height: 150 }]} />
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
  glowingOrb: {
    position: 'absolute',
    zIndex: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 50,
  },
  staticOrb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    zIndex: 0,
  },
  boltContainer: {
    position: 'absolute',
    zIndex: 2,
  },
  boltSegment: {
    position: 'absolute',
    width: 25,
    height: 3,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
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
  purple: '#9D4EDD',
  electricBlue: '#00D4FF',
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
