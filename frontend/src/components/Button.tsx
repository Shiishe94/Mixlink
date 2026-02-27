import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NEON_COLORS } from './NeonBackground';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'neon';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const isDisabled = disabled || loading;

  if (variant === 'primary' || variant === 'neon') {
    return (
      <TouchableOpacity
        style={[styles.buttonWrapper, styles[`${size}Button`], isDisabled && styles.disabled, style]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isDisabled ? ['#333', '#444'] : [NEON_COLORS.cyan, NEON_COLORS.magenta]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.content}>
              {icon}
              <Text style={[styles.text, styles[`${size}Text`], textStyle]}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const buttonStyles = [
    styles.button,
    styles[variant],
    styles[`${size}Button`],
    isDisabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? NEON_COLORS.cyan : '#fff'} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: NEON_COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: {
    backgroundColor: NEON_COLORS.cyan,
  },
  secondary: {
    backgroundColor: NEON_COLORS.card,
    borderWidth: 1,
    borderColor: NEON_COLORS.cardBorder,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: NEON_COLORS.cyan,
    shadowColor: NEON_COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  danger: {
    backgroundColor: NEON_COLORS.error,
    shadowColor: NEON_COLORS.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  neon: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mediumButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  largeButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  text: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  primaryText: {
    color: '#000',
  },
  secondaryText: {
    color: '#fff',
  },
  outlineText: {
    color: NEON_COLORS.cyan,
    textShadowColor: NEON_COLORS.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  dangerText: {
    color: '#fff',
  },
  neonText: {
    color: '#fff',
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
});
