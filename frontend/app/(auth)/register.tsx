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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { useAuthStore } from '../../src/store/authStore';
import { NeonAlert, useNeonAlert } from '../../src/components/NeonAlert';

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<'dj' | 'organizer' | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const { alert, showAlert, hideAlert } = useNeonAlert();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleNext = () => {
    if (step === 1 && !userType) {
      showAlert('warning', 'Sélection requise', 'Veuillez sélectionner si vous êtes DJ ou Organisateur.');
      return;
    }
    if (step === 2) {
      if (!firstName.trim()) {
        showAlert('warning', 'Prénom manquant', 'Veuillez entrer votre prénom.');
        return;
      }
      if (!lastName.trim()) {
        showAlert('warning', 'Nom manquant', 'Veuillez entrer votre nom de famille.');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleRegister = async () => {
    if (!email.trim()) {
      showAlert('warning', 'Email manquant', 'Veuillez entrer votre adresse email.');
      return;
    }
    if (!validateEmail(email.trim())) {
      showAlert('error', 'Email invalide', 'Le format de l\'adresse email est incorrect.\nExemple : nom@domaine.com');
      return;
    }
    if (!password) {
      showAlert('warning', 'Mot de passe manquant', 'Veuillez entrer un mot de passe.');
      return;
    }
    if (password.length < 6) {
      showAlert('error', 'Mot de passe trop court', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('error', 'Mots de passe différents', 'Les deux mots de passe ne correspondent pas. Veuillez réessayer.');
      return;
    }

    setLoading(true);
    try {
      await register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        user_type: userType!,
        phone: phone || undefined,
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('existe') || msg.toLowerCase().includes('duplicate')) {
        showAlert('error', 'Email déjà utilisé', 'Un compte existe déjà avec cette adresse email. Essayez de vous connecter.');
      } else {
        showAlert('error', 'Inscription échouée', msg || 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => (step > 1 ? setStep(step - 1) : router.back())}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>Étape {step}/3</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <View style={styles.stepContent}>
              <Image
                source={{ uri: 'https://customer-assets.emergentagent.com/job_81ff48f5-d5df-4c9e-b7e3-186c0149c723/artifacts/d9apiwuf_A93D7E82-3928-43DA-B03F-A012568E9B90.png' }}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.title}>Qui êtes-vous ?</Text>
              <Text style={styles.subtitle}>Sélectionnez votre profil</Text>

              <TouchableOpacity
                style={[
                  styles.typeCard,
                  userType === 'dj' && styles.typeCardSelected,
                ]}
                onPress={() => setUserType('dj')}
              >
                <View style={styles.typeIcon}>
                  <Ionicons name="disc" size={40} color="#6C5CE7" />
                </View>
                <Text style={styles.typeTitle}>Je suis DJ</Text>
                <Text style={styles.typeDescription}>
                  Je souhaite proposer mes services pour des événements
                </Text>
                {userType === 'dj' && (
                  <View style={styles.checkIcon}>
                    <Ionicons name="checkmark-circle" size={24} color="#00B894" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeCard,
                  userType === 'organizer' && styles.typeCardSelected,
                ]}
                onPress={() => setUserType('organizer')}
              >
                <View style={styles.typeIcon}>
                  <Ionicons name="calendar" size={40} color="#6C5CE7" />
                </View>
                <Text style={styles.typeTitle}>Je suis Organisateur</Text>
                <Text style={styles.typeDescription}>
                  Je cherche des DJ pour mes événements
                </Text>
                {userType === 'organizer' && (
                  <View style={styles.checkIcon}>
                    <Ionicons name="checkmark-circle" size={24} color="#00B894" />
                  </View>
                )}
              </TouchableOpacity>

              <Button title="Continuer" onPress={handleNext} style={styles.nextButton} />
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.title}>Vos informations</Text>
              <Text style={styles.subtitle}>Présentez-vous</Text>

              <Input
                label="Prénom"
                placeholder="Votre prénom"
                value={firstName}
                onChangeText={setFirstName}
                leftIcon="person"
              />

              <Input
                label="Nom"
                placeholder="Votre nom"
                value={lastName}
                onChangeText={setLastName}
                leftIcon="person-outline"
              />

              <Input
                label="Téléphone (optionnel)"
                placeholder="06 12 34 56 78"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                leftIcon="call"
              />

              <Button title="Continuer" onPress={handleNext} style={styles.nextButton} />
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.title}>Créez votre compte</Text>
              <Text style={styles.subtitle}>Vos identifiants de connexion</Text>

              <Input
                label="Email"
                placeholder="votre@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail"
              />

              <Input
                label="Mot de passe"
                placeholder="Minimum 6 caractères"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                leftIcon="lock-closed"
              />

              <Input
                label="Confirmer le mot de passe"
                placeholder="Retapez votre mot de passe"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                leftIcon="lock-closed"
              />

              <Button
                title="Créer mon compte"
                onPress={handleRegister}
                loading={loading}
                style={styles.nextButton}
              />
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <NeonAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={hideAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: '#636E72',
    marginRight: 40,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  stepContent: {
    flex: 1,
    paddingTop: 20,
    alignItems: 'center',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#636E72',
    marginBottom: 32,
  },
  typeCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  typeCardSelected: {
    borderColor: '#6C5CE7',
  },
  typeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2D3436',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  typeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  typeDescription: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 20,
  },
  checkIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  nextButton: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#636E72',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C5CE7',
  },
});
