import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
import { authApi } from '../../src/services/api';
import { NeonBackgroundSimple, NEON_COLORS } from '../../src/components/NeonBackground';
import { NeonAlert, useNeonAlert } from '../../src/components/NeonAlert';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
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

  const handleSubmit = async () => {
    if (!email.trim()) {
      showAlert('warning', 'Email manquant', 'Veuillez entrer votre adresse email.');
      return;
    }

    if (!validateEmail(email.trim())) {
      showAlert('error', 'Email invalide', 'Le format de l\'adresse email est incorrect.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.forgotPassword(email.trim());
      setEmailSent(true);
      showAlert('success', 'Email envoyé', 'Si cette adresse existe, vous recevrez un lien de réinitialisation.');
    } catch (error: any) {
      showAlert('error', 'Erreur', error.response?.data?.detail || 'Une erreur est survenue.');
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
              {/* Back Button */}
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color={NEON_COLORS.cyan} />
                <Text style={styles.backText}>Retour</Text>
              </TouchableOpacity>

              <View style={styles.header}>
                <Animated.View style={[styles.iconContainer, glowStyle]}>
                  <Ionicons name="key-outline" size={60} color={NEON_COLORS.magenta} />
                </Animated.View>
                <Text style={styles.title}>Mot de passe oublié</Text>
                <Text style={styles.subtitle}>
                  Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </Text>
              </View>

              {emailSent ? (
                <View style={styles.successContainer}>
                  <View style={styles.successIconWrapper}>
                    <Ionicons name="checkmark-circle" size={80} color={NEON_COLORS.green} />
                  </View>
                  <Text style={styles.successTitle}>Email envoyé !</Text>
                  <Text style={styles.successText}>
                    Consultez votre boîte de réception pour le lien de réinitialisation.
                    Le lien expire dans 1 heure.
                  </Text>
                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={() => router.replace('/(auth)/login')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[NEON_COLORS.cyan, NEON_COLORS.magenta]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.loginButtonGradient}
                    >
                      <Text style={styles.loginButtonText}>Retour à la connexion</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
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

                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.8}
                    data-testid="forgot-password-submit-btn"
                  >
                    <LinearGradient
                      colors={[NEON_COLORS.magenta, NEON_COLORS.cyan]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitButtonGradient}
                    >
                      {loading ? (
                        <Text style={styles.submitButtonText}>Envoi en cours...</Text>
                      ) : (
                        <Text style={styles.submitButtonText}>Envoyer le lien</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>Vous vous souvenez ?</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.loginLink}>Se connecter</Text>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backText: {
    color: NEON_COLORS.cyan,
    fontSize: 16,
    marginLeft: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 50,
    backgroundColor: NEON_COLORS.card,
    borderWidth: 2,
    borderColor: NEON_COLORS.magenta,
    shadowColor: NEON_COLORS.magenta,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: NEON_COLORS.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
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
  submitButton: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: NEON_COLORS.magenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  successContainer: {
    alignItems: 'center',
    padding: 20,
  },
  successIconWrapper: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: NEON_COLORS.green,
    marginBottom: 12,
    textShadowColor: NEON_COLORS.green,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  successText: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  loginButton: {
    width: '100%',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: NEON_COLORS.cyan,
    textShadowColor: NEON_COLORS.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
});
