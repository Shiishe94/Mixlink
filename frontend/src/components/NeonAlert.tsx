import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NEON_COLORS } from './NeonBackground';

const { width } = Dimensions.get('window');

export type AlertType = 'error' | 'success' | 'warning' | 'info';

interface NeonAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  onClose: () => void;
  autoHide?: boolean;
  autoHideDuration?: number;
  buttonText?: string;
}

const ALERT_CONFIG: Record<AlertType, { icon: keyof typeof Ionicons.glyphMap; colors: string[]; glowColor: string }> = {
  error: {
    icon: 'alert-circle',
    colors: ['#FF4444', '#FF1493'],
    glowColor: '#FF4444',
  },
  success: {
    icon: 'checkmark-circle',
    colors: [NEON_COLORS.green, NEON_COLORS.cyan],
    glowColor: NEON_COLORS.green,
  },
  warning: {
    icon: 'warning',
    colors: ['#FFD700', '#FF8C00'],
    glowColor: '#FFD700',
  },
  info: {
    icon: 'information-circle',
    colors: [NEON_COLORS.cyan, NEON_COLORS.magenta],
    glowColor: NEON_COLORS.cyan,
  },
};

export const NeonAlert: React.FC<NeonAlertProps> = ({
  visible,
  type = 'error',
  title,
  message,
  onClose,
  autoHide = false,
  autoHideDuration = 4000,
  buttonText = 'OK',
}) => {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const iconPulse = useSharedValue(1);

  const config = ALERT_CONFIG[type];

  const handleClose = useCallback(() => {
    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0.5, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 250 });
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 200,
      });
      iconPulse.value = withTiming(1.15, {
        duration: 600,
        easing: Easing.inOut(Easing.ease),
      }, () => {
        iconPulse.value = withTiming(1, { duration: 400 });
      });
    }
  }, [visible]);

  useEffect(() => {
    if (visible && autoHide) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [visible, autoHide, autoHideDuration, handleClose]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconPulse.value }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <TouchableOpacity
          style={styles.overlayTouch}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View style={[styles.modalContainer, modalStyle]}>
          <View style={[styles.modal, { borderColor: config.glowColor + '60' }]}>
            {/* Neon glow top line */}
            <LinearGradient
              colors={config.colors as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.topLine}
            />

            {/* Icon */}
            <Animated.View style={[styles.iconContainer, iconStyle]}>
              <View style={[styles.iconBackground, { shadowColor: config.glowColor }]}>
                <LinearGradient
                  colors={config.colors as [string, string]}
                  style={styles.iconGradient}
                >
                  <Ionicons name={config.icon} size={36} color="#fff" />
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Content */}
            <Text style={[styles.title, { textShadowColor: config.glowColor }]}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {/* Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={config.colors as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>{buttonText}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Hook for easy usage
interface AlertState {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
}

export const useNeonAlert = () => {
  const [alert, setAlert] = React.useState<AlertState>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlert({ visible: true, type, title, message });
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, visible: false }));
  };

  return { alert, showAlert, hideAlert };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: width - 48,
    maxWidth: 380,
  },
  modal: {
    backgroundColor: NEON_COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 4,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  iconContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  iconBackground: {
    width: 72,
    height: 72,
    borderRadius: 36,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  message: {
    fontSize: 15,
    color: NEON_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  button: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
