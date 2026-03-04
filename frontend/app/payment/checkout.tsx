import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { bookingApi, paymentApi } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { NEON_COLORS } from '../../src/components/NeonBackground';
import { NeonAlert, useNeonAlert } from '../../src/components/NeonAlert';

export default function CheckoutScreen() {
  const { booking_id, dj_name, event_title, amount } = useLocalSearchParams<{
    booking_id: string;
    dj_name: string;
    event_title: string;
    amount: string;
  }>();

  const { user } = useAuthStore();
  const { alert, showAlert, hideAlert } = useNeonAlert();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const bookingAmount = parseFloat(amount || '0');
  const serviceFee = Math.round(bookingAmount * 0.075 * 100) / 100;
  const totalAmount = Math.round((bookingAmount + serviceFee) * 100) / 100;

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handlePay = async () => {
    if (!firstName.trim()) {
      showAlert('warning', 'Prénom requis', 'Veuillez entrer votre prénom.');
      return;
    }
    if (!lastName.trim()) {
      showAlert('warning', 'Nom requis', 'Veuillez entrer votre nom de famille.');
      return;
    }
    if (!email.trim() || !validateEmail(email)) {
      showAlert('error', 'Email invalide', 'Veuillez entrer une adresse email valide.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      showAlert('warning', 'Téléphone requis', 'Veuillez entrer un numéro de téléphone valide.');
      return;
    }

    setLoading(true);
    try {
      const originUrl = Platform.OS === 'web'
        ? window.location.origin
        : process.env.EXPO_PUBLIC_BACKEND_URL || '';

      const response = await paymentApi.createStripeCheckout(booking_id!, originUrl);
      const { url } = response.data;

      if (url) {
        if (Platform.OS === 'web') {
          window.location.href = url;
        } else {
          await Linking.openURL(url);
        }
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail || '';
      showAlert('error', 'Erreur de paiement', msg || 'Impossible de lancer le paiement. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paiement</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={[NEON_COLORS.cyan + '15', NEON_COLORS.magenta + '10']}
              style={styles.summaryGradient}
            >
              <View style={styles.summaryHeader}>
                <Ionicons name="receipt-outline" size={22} color={NEON_COLORS.cyan} />
                <Text style={styles.summaryTitle}>Récapitulatif</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>DJ</Text>
                <Text style={styles.summaryValue}>{dj_name || 'DJ'}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Événement</Text>
                <Text style={styles.summaryValue}>{event_title || 'Événement'}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Prestation DJ</Text>
                <Text style={styles.summaryValue}>{bookingAmount.toFixed(2)}€</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Frais de service (7.5%)</Text>
                <Text style={styles.summaryValueSmall}>{serviceFee.toFixed(2)}€</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total à payer</Text>
                <Text style={styles.totalValue}>{totalAmount.toFixed(2)}€</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Identity Form */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Ionicons name="person-outline" size={22} color={NEON_COLORS.cyan} />
              <Text style={styles.formTitle}>Informations de facturation</Text>
            </View>

            <Input
              label="Prénom"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Votre prénom"
              icon="person-outline"
            />

            <Input
              label="Nom"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Votre nom de famille"
              icon="person-outline"
            />

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              keyboardType="email-address"
              icon="mail-outline"
            />

            <Input
              label="Téléphone"
              value={phone}
              onChangeText={setPhone}
              placeholder="+33 6 12 34 56 78"
              keyboardType="phone-pad"
              icon="call-outline"
            />
          </View>

          {/* Security Badge */}
          <View style={styles.securityCard}>
            <Ionicons name="shield-checkmark" size={20} color={NEON_COLORS.green} />
            <View style={styles.securityTextContainer}>
              <Text style={styles.securityTitle}>Paiement 100% sécurisé</Text>
              <Text style={styles.securityDesc}>
                Vos données sont chiffrées par Stripe. Les fonds sont retenus jusqu'à la validation de la prestation par l'organisateur.
              </Text>
            </View>
          </View>

          {/* Pay Button */}
          <TouchableOpacity
            style={[styles.payButton, loading && styles.payButtonDisabled]}
            onPress={handlePay}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#635BFF', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.payButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={20} color="#fff" />
                  <Text style={styles.payButtonText}>
                    Payer {totalAmount.toFixed(2)}€ par carte sécurisée
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Payment Methods */}
          <View style={styles.methodsRow}>
            <Ionicons name="card" size={28} color="#636E72" />
            <Text style={styles.methodsText}>Visa, Mastercard, AMEX</Text>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
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
    backgroundColor: NEON_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryCard: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.15)',
  },
  summaryGradient: {
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    maxWidth: '55%',
    textAlign: 'right',
  },
  summaryValueSmall: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: NEON_COLORS.cyan,
  },
  formCard: {
    marginTop: 20,
    backgroundColor: NEON_COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  securityCard: {
    marginTop: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 255, 135, 0.06)',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 135, 0.15)',
  },
  securityTextContainer: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NEON_COLORS.green,
    marginBottom: 4,
  },
  securityDesc: {
    fontSize: 13,
    color: NEON_COLORS.textSecondary,
    lineHeight: 19,
  },
  payButton: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#635BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  payButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  methodsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
  },
  methodsText: {
    fontSize: 13,
    color: '#636E72',
  },
  bottomPadding: {
    height: 40,
  },
});
