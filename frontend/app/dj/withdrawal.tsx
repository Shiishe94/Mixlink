import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { djWalletApi } from '../../src/services/api';
import { goBack } from '../../src/utils/navigation';
import { NeonBackgroundSimple, NEON_COLORS } from '../../src/components/NeonBackground';

// IBAN Validation Function
const validateIBAN = (iban: string): { valid: boolean; error?: string } => {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  if (cleanIban.length < 15 || cleanIban.length > 34) {
    return { valid: false, error: 'L\'IBAN doit contenir entre 15 et 34 caractères' };
  }
  
  if (!/^[A-Z]{2}/.test(cleanIban)) {
    return { valid: false, error: 'L\'IBAN doit commencer par un code pays (ex: FR, DE, ES)' };
  }
  
  if (!/^[A-Z]{2}[0-9]{2}/.test(cleanIban)) {
    return { valid: false, error: 'Format IBAN invalide' };
  }
  
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban)) {
    return { valid: false, error: 'L\'IBAN contient des caractères non autorisés' };
  }
  
  // IBAN checksum validation (ISO 7064 Mod 97-10)
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
  let numericIban = '';
  for (const char of rearranged) {
    if (/[0-9]/.test(char)) {
      numericIban += char;
    } else {
      numericIban += (char.charCodeAt(0) - 55).toString();
    }
  }
  
  let remainder = 0;
  for (let i = 0; i < numericIban.length; i += 7) {
    const chunk = remainder + numericIban.slice(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }
  
  if (remainder !== 1) {
    return { valid: false, error: 'IBAN invalide - vérifiez les chiffres saisis' };
  }
  
  return { valid: true };
};

// Email validation
const validateEmail = (email: string): { valid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { valid: false, error: 'Veuillez entrer une adresse email valide' };
  }
  return { valid: true };
};

// Format IBAN with spaces
const formatIBAN = (value: string): string => {
  const clean = value.replace(/\s/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
};

const MINIMUM_WITHDRAWAL = 50;

type WithdrawalMethod = 'bank' | 'paypal';

interface WalletData {
  wallet: {
    pending_balance: number;
    available_balance: number;
    total_earned: number;
    total_withdrawn: number;
  };
}

export default function WithdrawalScreen() {
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [method, setMethod] = useState<WithdrawalMethod>('bank');
  const [iban, setIban] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [ibanError, setIbanError] = useState('');
  const [paypalError, setPaypalError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const res = await djWalletApi.getWallet();
      setWalletData(res.data);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIbanChange = (value: string) => {
    const formatted = formatIBAN(value);
    setIban(formatted);
    setIbanError('');
  };

  const handlePaypalEmailChange = (value: string) => {
    setPaypalEmail(value.trim());
    setPaypalError('');
  };

  const handleAmountChange = (value: string) => {
    const clean = value.replace(/[^0-9.]/g, '');
    setAmount(clean);
    setAmountError('');
  };

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate based on method
    if (method === 'bank') {
      const ibanValidation = validateIBAN(iban);
      if (!ibanValidation.valid) {
        setIbanError(ibanValidation.error || 'IBAN invalide');
        isValid = false;
      }
    } else {
      const emailValidation = validateEmail(paypalEmail);
      if (!emailValidation.valid) {
        setPaypalError(emailValidation.error || 'Email invalide');
        isValid = false;
      }
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum)) {
      setAmountError('Veuillez entrer un montant');
      isValid = false;
    } else if (amountNum < MINIMUM_WITHDRAWAL) {
      setAmountError(`Le montant minimum est de ${MINIMUM_WITHDRAWAL}€`);
      isValid = false;
    } else if (walletData && amountNum > walletData.wallet.available_balance) {
      setAmountError('Solde disponible insuffisant');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  const confirmWithdrawal = async () => {
    setWithdrawLoading(true);
    try {
      const cleanIban = iban.replace(/\s/g, '');
      
      const requestData = {
        amount: parseFloat(amount),
        method: method,
        ...(method === 'bank' ? { iban: cleanIban } : { paypal_email: paypalEmail })
      };
      
      const response = await djWalletApi.requestWithdrawal(
        parseFloat(amount),
        method === 'bank' ? cleanIban : '',
        method === 'paypal' ? paypalEmail : ''
      );
      
      setShowConfirmModal(false);
      setSuccessMessage(response.data.message || 'Votre demande de retrait a été envoyée avec succès.');
      setShowSuccessModal(true);
      
      // Reload wallet data
      await loadWallet();
      // Clear form
      setIban('');
      setPaypalEmail('');
      setAmount('');
    } catch (error: any) {
      setShowConfirmModal(false);
      setAmountError(error.response?.data?.detail || 'Erreur lors du retrait');
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <NeonBackgroundSimple>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={NEON_COLORS.cyan} />
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={goBack} data-testid="back-button">
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Retrait de fonds</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Solde disponible</Text>
              <Text style={styles.balanceValue} data-testid="available-balance">
                {walletData?.wallet.available_balance.toFixed(2) || '0.00'}€
              </Text>
              <View style={styles.balanceInfo}>
                <Ionicons name="checkmark-circle" size={16} color={NEON_COLORS.green} />
                <Text style={styles.balanceInfoText}>Disponible pour retrait</Text>
              </View>
            </View>

            {/* Method Selection */}
            <View style={styles.methodCard}>
              <Text style={styles.sectionTitle}>Méthode de retrait</Text>
              <View style={styles.methodButtons}>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    method === 'bank' && styles.methodButtonActive
                  ]}
                  onPress={() => setMethod('bank')}
                  data-testid="method-bank"
                >
                  <Ionicons 
                    name="card-outline" 
                    size={24} 
                    color={method === 'bank' ? NEON_COLORS.cyan : '#6B7280'} 
                  />
                  <Text style={[
                    styles.methodButtonText,
                    method === 'bank' && styles.methodButtonTextActive
                  ]}>
                    Virement IBAN
                  </Text>
                  {method === 'bank' && (
                    <Ionicons name="checkmark-circle" size={20} color={NEON_COLORS.cyan} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    method === 'paypal' && styles.methodButtonActive
                  ]}
                  onPress={() => setMethod('paypal')}
                  data-testid="method-paypal"
                >
                  <Ionicons 
                    name="logo-paypal" 
                    size={24} 
                    color={method === 'paypal' ? '#00457C' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.methodButtonText,
                    method === 'paypal' && styles.methodButtonTextActive
                  ]}>
                    PayPal
                  </Text>
                  {method === 'paypal' && (
                    <Ionicons name="checkmark-circle" size={20} color="#00457C" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              {/* IBAN or PayPal Input based on method */}
              {method === 'bank' ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>IBAN</Text>
                  <View style={[styles.inputWrapper, ibanError ? styles.inputError : null]}>
                    <Ionicons name="card-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={iban}
                      onChangeText={handleIbanChange}
                      placeholder="Entrez votre IBAN"
                      placeholderTextColor="#6B7280"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      data-testid="iban-input"
                    />
                  </View>
                  {ibanError ? (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={14} color="#EF4444" />
                      <Text style={styles.errorText} data-testid="iban-error">{ibanError}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email PayPal</Text>
                  <View style={[styles.inputWrapper, paypalError ? styles.inputError : null]}>
                    <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={paypalEmail}
                      onChangeText={handlePaypalEmailChange}
                      placeholder="votre@email-paypal.com"
                      placeholderTextColor="#6B7280"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      data-testid="paypal-input"
                    />
                  </View>
                  {paypalError ? (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={14} color="#EF4444" />
                      <Text style={styles.errorText} data-testid="paypal-error">{paypalError}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Montant du retrait</Text>
                <View style={[styles.inputWrapper, amountError ? styles.inputError : null]}>
                  <Ionicons name="cash-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={handleAmountChange}
                    placeholder="Montant du retrait"
                    placeholderTextColor="#6B7280"
                    keyboardType="decimal-pad"
                    data-testid="amount-input"
                  />
                  <Text style={styles.currencyLabel}>EUR</Text>
                </View>
                {amountError ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <Text style={styles.errorText} data-testid="amount-error">{amountError}</Text>
                  </View>
                ) : null}
                <Text style={styles.minAmountText}>Minimum: {MINIMUM_WITHDRAWAL}€</Text>
              </View>
            </View>

            {/* Security Warning */}
            <View style={styles.warningCard}>
              <View style={styles.warningHeader}>
                <Ionicons name="warning" size={24} color="#F59E0B" />
                <Text style={styles.warningTitle}>Avertissement de sécurité</Text>
              </View>
              <View style={styles.warningContent}>
                <View style={styles.warningItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#9CA3AF" />
                  <Text style={styles.warningText}>
                    {method === 'bank' 
                      ? 'Vérifiez attentivement votre IBAN avant de confirmer votre retrait.'
                      : 'Vérifiez attentivement votre adresse PayPal avant de confirmer.'}
                  </Text>
                </View>
                <View style={styles.warningItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#9CA3AF" />
                  <Text style={styles.warningText}>
                    {method === 'bank'
                      ? 'Assurez-vous que l\'IBAN saisi est correct et vous appartient.'
                      : 'Assurez-vous que l\'email PayPal saisi est correct et actif.'}
                  </Text>
                </View>
                <View style={styles.warningItem}>
                  <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                  <Text style={styles.warningTextDanger}>
                    {method === 'bank'
                      ? 'Toute erreur dans l\'IBAN peut entraîner l\'envoi des fonds vers un mauvais compte bancaire.'
                      : 'Toute erreur dans l\'adresse PayPal peut entraîner la perte des fonds.'}
                  </Text>
                </View>
                <View style={styles.warningItem}>
                  <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                  <Text style={styles.warningTextDanger}>
                    Les demandes de retrait ne peuvent pas être modifiées ou annulées après validation.
                  </Text>
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                method === 'paypal' && styles.submitButtonPaypal,
                (!walletData || walletData.wallet.available_balance < MINIMUM_WITHDRAWAL) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!walletData || walletData.wallet.available_balance < MINIMUM_WITHDRAWAL}
              activeOpacity={(!walletData || walletData.wallet.available_balance < MINIMUM_WITHDRAWAL) ? 1 : 0.7}
              data-testid="submit-withdrawal-button"
            >
              <Ionicons 
                name={method === 'paypal' ? 'logo-paypal' : 'send'} 
                size={20} 
                color={(!walletData || walletData.wallet.available_balance < MINIMUM_WITHDRAWAL) ? '#94A3B8' : '#fff'} 
              />
              <Text style={[
                styles.submitButtonText,
                (!walletData || walletData.wallet.available_balance < MINIMUM_WITHDRAWAL) && styles.submitButtonTextDisabled
              ]}>
                Demander le retrait
              </Text>
            </TouchableOpacity>

            {/* Processing Info */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color="#6B7280" />
              <Text style={styles.infoText}>
                {method === 'bank' 
                  ? 'Les retraits sont traités sous 3-5 jours ouvrés par virement SEPA.'
                  : 'Les paiements PayPal sont traités instantanément.'}
              </Text>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalIconContainer}>
                <Ionicons 
                  name={method === 'paypal' ? 'logo-paypal' : 'help-circle'} 
                  size={48} 
                  color={method === 'paypal' ? '#00457C' : NEON_COLORS.cyan} 
                />
              </View>
              <Text style={styles.modalTitle}>Confirmer le retrait</Text>
              <Text style={styles.modalMessage}>
                {method === 'bank' 
                  ? 'Confirmez-vous que votre IBAN est correct ?'
                  : 'Confirmez-vous que votre adresse PayPal est correcte ?'}
              </Text>
              
              <View style={styles.modalDetails}>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>
                    {method === 'bank' ? 'IBAN:' : 'PayPal:'}
                  </Text>
                  <Text style={styles.modalDetailValue} data-testid="confirm-destination">
                    {method === 'bank' ? iban : paypalEmail}
                  </Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Montant:</Text>
                  <Text style={styles.modalDetailValueHighlight} data-testid="confirm-amount">{amount}€</Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Méthode:</Text>
                  <Text style={styles.modalDetailValue}>
                    {method === 'bank' ? 'Virement SEPA' : 'PayPal'}
                  </Text>
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowConfirmModal(false)}
                  disabled={withdrawLoading}
                  data-testid="cancel-confirm-button"
                >
                  <Text style={styles.modalCancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalConfirmButton,
                    method === 'paypal' && styles.modalConfirmButtonPaypal
                  ]}
                  onPress={confirmWithdrawal}
                  disabled={withdrawLoading}
                  data-testid="confirm-withdrawal-button"
                >
                  {withdrawLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmButtonText}>Confirmer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={64} color={NEON_COLORS.green} />
              </View>
              <Text style={styles.modalTitle}>Demande envoyée</Text>
              <Text style={styles.successMessage} data-testid="success-message">
                {successMessage}
              </Text>
              <Text style={styles.successSubMessage}>
                {method === 'bank' 
                  ? 'Le virement sera traité sous 3-5 jours ouvrés.'
                  : 'Le paiement PayPal sera traité rapidement.'}
              </Text>
              <TouchableOpacity
                style={styles.successButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  goBack();
                }}
                data-testid="close-success-button"
              >
                <Text style={styles.successButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: NEON_COLORS.cardBorder,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: NEON_COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  balanceCard: {
    backgroundColor: NEON_COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: NEON_COLORS.cardBorder,
  },
  balanceLabel: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: NEON_COLORS.green,
    marginBottom: 8,
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceInfoText: {
    fontSize: 13,
    color: NEON_COLORS.textSecondary,
  },
  methodCard: {
    backgroundColor: NEON_COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: NEON_COLORS.cardBorder,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: NEON_COLORS.background,
    borderWidth: 2,
    borderColor: NEON_COLORS.cardBorder,
    gap: 10,
  },
  methodButtonActive: {
    borderColor: NEON_COLORS.cyan,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: NEON_COLORS.textSecondary,
  },
  methodButtonTextActive: {
    color: '#fff',
  },
  formCard: {
    backgroundColor: NEON_COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: NEON_COLORS.cardBorder,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEON_COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: NEON_COLORS.cardBorder,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#fff',
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: NEON_COLORS.textMuted,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
  },
  minAmountText: {
    fontSize: 12,
    color: NEON_COLORS.textMuted,
    marginTop: 8,
  },
  warningCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  warningContent: {
    gap: 12,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  warningTextDanger: {
    flex: 1,
    fontSize: 14,
    color: '#FCA5A5',
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NEON_COLORS.cyan,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    marginBottom: 16,
  },
  submitButtonPaypal: {
    backgroundColor: '#00457C',
  },
  submitButtonDisabled: {
    backgroundColor: '#475569',
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  submitButtonTextDisabled: {
    color: '#94A3B8',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: NEON_COLORS.card,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: NEON_COLORS.textSecondary,
    lineHeight: 18,
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: NEON_COLORS.card,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NEON_COLORS.cardBorder,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: NEON_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalDetails: {
    width: '100%',
    backgroundColor: NEON_COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalDetailLabel: {
    fontSize: 14,
    color: NEON_COLORS.textMuted,
  },
  modalDetailValue: {
    fontSize: 14,
    color: '#E2E8F0',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    maxWidth: '60%',
  },
  modalDetailValueHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: NEON_COLORS.green,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: NEON_COLORS.cardBorder,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: NEON_COLORS.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: NEON_COLORS.cyan,
    alignItems: 'center',
  },
  modalConfirmButtonPaypal: {
    backgroundColor: '#00457C',
  },
  modalConfirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  successMessage: {
    fontSize: 16,
    color: NEON_COLORS.green,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  successSubMessage: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  successButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: NEON_COLORS.green,
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
