import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { verifyEmail } from '../src/services/api';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail(token)
        .then(() => {
          setStatus('success');
          setMessage('Votre email a été vérifié avec succès !');
        })
        .catch((err) => {
          setStatus('error');
          setMessage(err?.response?.data?.detail || 'Token invalide ou expiré.');
        });
    } else {
      setStatus('error');
      setMessage('Token manquant.');
    }
  }, [token]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.text}>Vérification en cours...</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
            </View>
            <Text style={styles.title}>Email vérifié !</Text>
            <Text style={styles.text}>{message}</Text>
            <TouchableOpacity
              data-testid="verify-email-go-home"
              style={styles.button}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.buttonText}>Accéder à MixLink</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.iconCircle}>
              <Ionicons name="close-circle" size={64} color="#ef4444" />
            </View>
            <Text style={styles.title}>Échec de vérification</Text>
            <Text style={styles.text}>{message}</Text>
            <TouchableOpacity
              data-testid="verify-email-retry"
              style={[styles.button, { backgroundColor: '#374151' }]}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.buttonText}>Retour à la connexion</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#111118',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    maxWidth: 400,
    width: '90%',
    borderWidth: 1,
    borderColor: '#1e1e2e',
    gap: 16,
  },
  iconCircle: {
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  text: {
    fontSize: 15,
    color: '#b0b0c0',
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 50,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
