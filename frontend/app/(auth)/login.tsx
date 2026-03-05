import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { useAuthStore } from '../../src/store/authStore';
import { NeonBackgroundSimple, NEON_COLORS } from '../../src/components/NeonBackground';
import { NeonAlert, useNeonAlert } from '../../src/components/NeonAlert';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { alert, showAlert, hideAlert } = useNeonAlert();
  
  const glowAnim = useSharedValue(0.5);
  
  useEffect(() => {
    glowAnim.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);
  
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowAnim.value,
    opacity: 0.8 + glowAnim.value * 0.2,
  }));

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    if (!email.trim() && !password.trim()) {
      showAlert('warning', 'Champs vides', 'Veuillez entrer votre email et votre mot de passe.');
      return;
    }

    if (!email.trim()) {
      showAlert('warning', 'Email manquant', 'Veuillez entrer votre adresse email.');
      return;
    }

    if (!validateEmail(email.trim())) {
      showAlert('error', 'Email invalide', 'Le format de l\'adresse email est incorrect.\nExemple : nom@domaine.com');
      return;
    }

    if (!password.trim()) {
      showAlert('warning', 'Mot de passe manquant', 'Veuillez entrer votre mot de passe.');
      return;
    }

    if (password.length < 6) {
      showAlert('error', 'Mot de passe trop court', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('mot de passe') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('incorrect')) {
        showAlert('error', 'Identifiants incorrects', 'L\'email ou le mot de passe est incorrect. Veuillez réessayer.');
      } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('introuvable')) {
        showAlert('error', 'Compte introuvable', 'Aucun compte n\'est associé à cette adresse email.');
      } else {
        showAlert('error', 'Connexion échouée', msg || 'Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <NeonBackgroundSimple>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              Platform.OS === 'web' && { alignItems: 'center' },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={[
              styles.formWrapper,
              Platform.OS === 'web' && { maxWidth: 420, width: '100%' },
            ]}>
            <View style={styles.header}>
              <Animated.View style={[styles.logoContainer, glowStyle]}>
                <Image
                  source={{ uri: 'https://customer-assets.emergentagent.com/job_81ff48f5-d5df-4c9e-b7e3-186c0149c723/artifacts/d9apiwuf_A93D7E82-3928-43DA-B03F-A012568E9B90.png' }}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </Animated.View>
              <Text style={styles.title}>DJ Booking</Text>
              <Text style={styles.subtitle}>Trouvez le DJ parfait pour vos événements</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.neonInput}>
                  <Ionicons name="mail" size={20} color={NEON_COLORS.cyan} style={styles.inputIcon} />
                  <View style={styles.inputContainer}>
                    <Input
                      placeholder="votre@email.com"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      containerStyle={styles.inputNoMargin}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Mot de passe</Text>
                <View style={styles.neonInput}>
                  <Ionicons name="lock-closed" size={20} color={NEON_COLORS.magenta} style={styles.inputIcon} />
                  <View style={styles.inputContainer}>
                    <Input
                      placeholder="Votre mot de passe"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      containerStyle={styles.inputNoMargin}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
                data-testid="login-button"
              >
                <LinearGradient
                  colors={[NEON_COLORS.cyan, NEON_COLORS.magenta]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButtonGradient}
                >
                  {loading ? (
                    <Text style={styles.loginButtonText}>Connexion...</Text>
                  ) : (
                    <Text style={styles.loginButtonText}>Se connecter</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Forgot Password Link */}
              <TouchableOpacity 
                style={styles.forgotPasswordContainer}
                onPress={() => router.push('/(auth)/forgot-password')}
                data-testid="forgot-password-link"
              >
                <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Pas encore de compte ?</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.registerLink}>Créer un compte</Text>
              </TouchableOpacity>
            </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <NeonAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={hideAlert}
      />
    </NeonBackgroundSimple>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  formWrapper: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: NEON_COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: 140,
    height: 140,
    borderRadius: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: NEON_COLORS.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: NEON_COLORS.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    marginLeft: 4,
  },
  neonInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEON_COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: NEON_COLORS.cardBorder,
    paddingLeft: 16,
    overflow: 'hidden',
  },
  inputIcon: {
    marginRight: 8,
  },
  inputContainer: {
    flex: 1,
  },
  inputNoMargin: {
    marginBottom: 0,
  },
  loginButton: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: NEON_COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  loginButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: NEON_COLORS.magenta,
    fontWeight: '500',
    textShadowColor: NEON_COLORS.magenta,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: NEON_COLORS.cyan,
    textShadowColor: NEON_COLORS.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
});
