import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { paymentApi } from '../../src/services/api';
import { Button } from '../../src/components/Button';
import { NEON_COLORS } from '../../src/components/NeonBackground';

export default function PaymentSuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (session_id) {
      pollPaymentStatus(session_id, 0);
    } else {
      setStatus('error');
    }
  }, [session_id]);

  const pollPaymentStatus = async (sid: string, attempt: number) => {
    if (attempt >= 8) {
      setStatus('error');
      return;
    }

    try {
      const response = await paymentApi.getStripeStatus(sid);
      const data = response.data;
      setAttempts(attempt + 1);

      if (data.payment_status === 'paid') {
        setPaymentInfo(data);
        setStatus('success');
        return;
      } else if (data.status === 'expired') {
        setStatus('error');
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(sid, attempt + 1), 2500);
    } catch (error) {
      console.error('Poll error:', error);
      setTimeout(() => pollPaymentStatus(sid, attempt + 1), 3000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={NEON_COLORS.cyan} />
            <Text style={styles.loadingText}>Vérification du paiement...</Text>
            <Text style={styles.subText}>Tentative {attempts}/8</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <LinearGradient
              colors={[NEON_COLORS.green, NEON_COLORS.cyan]}
              style={styles.iconCircle}
            >
              <Ionicons name="checkmark" size={60} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>Paiement réussi !</Text>
            <Text style={styles.subtitle}>
              Votre paiement a été confirmé.{"\n"}
              Le DJ sera notifié de la réservation.
            </Text>
            {paymentInfo && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Montant payé</Text>
                <Text style={styles.infoValue}>
                  {(paymentInfo.amount_total / 100).toFixed(2)}€
                </Text>
              </View>
            )}
            <Button
              title="Voir mes réservations"
              onPress={() => router.replace('/(tabs)/bookings')}
              variant="primary"
              size="large"
            />
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.errorCircle}>
              <Ionicons name="close" size={60} color="#FF4444" />
            </View>
            <Text style={styles.title}>Erreur de paiement</Text>
            <Text style={styles.subtitle}>
              Le paiement n'a pas pu être confirmé.{"\n"}
              Veuillez réessayer ou contacter le support.
            </Text>
            <Button
              title="Retour aux réservations"
              onPress={() => router.replace('/(tabs)/bookings')}
              variant="outline"
              size="large"
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NEON_COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FF4444',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: NEON_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 20,
    fontWeight: '600',
  },
  subText: {
    fontSize: 14,
    color: NEON_COLORS.textMuted,
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: NEON_COLORS.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.2)',
  },
  infoLabel: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 32,
    fontWeight: '700',
    color: NEON_COLORS.green,
  },
});
