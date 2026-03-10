import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { djWalletApi } from '../../src/services/api';

export default function FeatureSuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (session_id) {
      djWalletApi.checkFeaturedStatus(session_id)
        .then((res) => {
          if (res.data.is_active) {
            setStatus('success');
          } else {
            setStatus('error');
          }
        })
        .catch(() => setStatus('error'));
    } else {
      setStatus('error');
    }
  }, [session_id]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={styles.text}>Activation en cours...</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.badge}>
              <Ionicons name="star" size={48} color="#f59e0b" />
            </View>
            <Text style={styles.title}>Vous êtes maintenant Vedette !</Text>
            <Text style={styles.text}>
              Votre profil apparaîtra en tête des résultats de recherche pendant 30 jours.
            </Text>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#f59e0b" />
              <Text style={styles.infoText}>Le badge Vedette est visible par tous les organisateurs</Text>
            </View>
            <TouchableOpacity
              data-testid="feature-success-go-profile"
              style={styles.button}
              onPress={() => router.replace('/dj/wallet')}
            >
              <Text style={styles.buttonText}>Voir mon portefeuille</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'error' && (
          <>
            <Ionicons name="close-circle" size={64} color="#ef4444" />
            <Text style={styles.title}>Erreur de paiement</Text>
            <Text style={styles.text}>Le paiement n'a pas été confirmé. Veuillez réessayer.</Text>
            <TouchableOpacity
              data-testid="feature-error-retry"
              style={[styles.button, { backgroundColor: '#374151' }]}
              onPress={() => router.replace('/dj/wallet')}
            >
              <Text style={styles.buttonText}>Retour au portefeuille</Text>
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
    maxWidth: 420,
    width: '90%',
    borderWidth: 1,
    borderColor: '#2d2020',
    gap: 16,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(245,158,11,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f59e0b',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    width: '100%',
  },
  infoText: {
    color: '#f59e0b',
    fontSize: 13,
    flex: 1,
  },
  button: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 50,
    marginTop: 8,
  },
  buttonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
});
