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
import { router, useLocalSearchParams } from 'expo-router';
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

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
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

  const handleSubmit = async () => {
    if (!password.trim()) {
      showAlert('warning', 'Mot de passe manquant', 'Veuillez entrer votre nouveau mot de passe.');
      return;
    }

    if (password.length < 6) {
      showAlert('error', 'Mot de passe trop court', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('error', 'Mots de passe différents', 'Les deux mots de passe ne correspondent pas.');
      return;
    }

    if (!token) {
      showAlert('error', 'Token manquant', 'Le lien de réinitialisation est invalide.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setResetSuccess(true);
      showAlert('success', 'Succès', 'Votre mot de passe a été réinitialisé avec succès.');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Une erreur est survenue.';
      showAlert('error', 'Erreur', message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <NeonBackgroundSimple>
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={80} color={NEON_COLORS.magenta} />
            <Text style={styles.errorTitle}>Lien invalide</Text>
            <Text style={styles.errorText}>
              Ce lien de réinitialisation est invalide ou a expiré.
              Veuillez demander un nouveau lien.
            </Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.replace('/(auth)/forgot-password')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[NEON_COLORS.cyan, NEON_COLORS.magenta]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>Demander un nouveau lien</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </NeonBackgroundSimple>
    );
  }

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
                <Animated.View style={[styles.iconContainer, glowStyle]}>
                  <Ionicons name="lock-open-outline" size={60} color={NEON_COLORS.cyan} />
                </Animated.View>
                <Text style={styles.title}>Nouveau mot de passe</Text>
                <Text style={styles.subtitle}>
                  Choisissez un mot de passe sécurisé d'au moins 6 caractères.
                </Text>
              </View>

              {resetSuccess ? (
                <View style={styles.successContainer}>
                  <View style={styles.successIconWrapper}>
                    <Ionicons name="checkmark-circle" size={80} color={NEON_COLORS.green} />
                  </View>
                  <Text style={styles.successTitle}>Mot de passe mis à jour !</Text>
                  <Text style={styles.successText}>
                    Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                  </Text>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.replace('/(auth)/login')}
                    activeOpacity={0.8}
                    data-testid="go-to-login-btn"
                  >
                    <LinearGradient
                      colors={[NEON_COLORS.cyan, NEON_COLORS.magenta]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.actionButtonGradient}
                    >
                      <Text style={styles.actionButtonText}>Se connecter</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.form}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
                    <View style={styles.neonInput}>
                      <Ionicons name="lock-closed" size={20} color={NEON_COLORS.cyan} style={styles.inputIcon} />
                      <View style={styles.inputContainer}>
                        <Input
                          placeholder="Votre nouveau mot de passe"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry
                          containerStyle={styles.inputNoMargin}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
                    <View style={styles.neonInput}>
                      <Ionicons name="lock-closed-outline" size={20} color={NEON_COLORS.magenta} style={styles.inputIcon} />
                      <View style={styles.inputContainer}>
                        <Input
                          placeholder="Confirmez votre mot de passe"
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry
                          containerStyle={styles.inputNoMargin}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Password strength indicator */}
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBar}>
                      <View 
                        style={[
                          styles.strengthFill, 
                          { 
                            width: password.length >= 12 ? '100%' : password.length >= 8 ? '66%' : password.length >= 6 ? '33%' : '0%',
                            backgroundColor: password.length >= 12 ? NEON_COLORS.green : password.length >= 8 ? NEON_COLORS.cyan : password.length >= 6 ? '#FFA500' : NEON_COLORS.magenta 
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.strengthText}>
                      {password.length === 0 ? '' : password.length < 6 ? 'Trop court' : password.length < 8 ? 'Faible' : password.length < 12 ? 'Moyen' : 'Fort'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.8}
                    data-testid="reset-password-submit-btn"
                  >
                    <LinearGradient
                      colors={[NEON_COLORS.cyan, NEON_COLORS.magenta]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.submitButtonGradient}
                    >
                      {loading ? (
                        <Text style={styles.submitButtonText}>Mise à jour...</Text>
                      ) : (
                        <Text style={styles.submitButtonText}>Réinitialiser</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: NEON_COLORS.magenta,
    marginTop: 20,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
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
    borderColor: NEON_COLORS.cyan,
    shadowColor: NEON_COLORS.cyan,
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
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: NEON_COLORS.card,
    borderRadius: 2,
    marginRight: 12,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    color: NEON_COLORS.textSecondary,
    width: 70,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: NEON_COLORS.cyan,
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
  actionButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: NEON_COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  actionButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
