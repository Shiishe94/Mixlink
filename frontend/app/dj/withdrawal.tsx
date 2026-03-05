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

// IBAN Validation Function
const validateIBAN = (iban: string): { valid: boolean; error?: string } => {
  // Remove spaces and convert to uppercase
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  // Check length (IBAN must be between 15 and 34 characters)
  if (cleanIban.length < 15 || cleanIban.length > 34) {
    return { valid: false, error: 'L\'IBAN doit contenir entre 15 et 34 caractères' };
  }
  
  // Check if it starts with 2 letters (country code)
  if (!/^[A-Z]{2}/.test(cleanIban)) {
    return { valid: false, error: 'L\'IBAN doit commencer par un code pays (ex: FR, DE, ES)' };
  }
  
  // Check if 3rd and 4th characters are digits (check digits)
  if (!/^[A-Z]{2}[0-9]{2}/.test(cleanIban)) {
    return { valid: false, error: 'Format IBAN invalide' };
  }
  
  // Check if rest contains only alphanumeric characters
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
  
  // Calculate mod 97 in chunks to avoid overflow
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

// Format IBAN with spaces every 4 characters
const formatIBAN = (value: string): string => {
  const clean = value.replace(/\s/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
};

const MINIMUM_WITHDRAWAL = 50;

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
  const [iban, setIban] = useState('');
  const [amount, setAmount] = useState('');
  const [ibanError, setIbanError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

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

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const clean = value.replace(/[^0-9.]/g, '');
    setAmount(clean);
    setAmountError('');
  };

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate IBAN
    const ibanValidation = validateIBAN(iban);
    if (!ibanValidation.valid) {
      setIbanError(ibanValidation.error || 'IBAN invalide');
      isValid = false;
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
      await djWalletApi.requestWithdrawal(parseFloat(amount), cleanIban);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      // Reload wallet data
      await loadWallet();
      // Clear form
      setIban('');
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
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
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.balanceInfoText}>Disponible pour retrait</Text>
            </View>
          </View>

          {/* Withdrawal Form */}
          <View style={styles.formCard}>
            {/* IBAN Input */}
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
                  Vérifiez attentivement votre IBAN avant de confirmer votre retrait.
                </Text>
              </View>
              <View style={styles.warningItem}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#9CA3AF" />
                <Text style={styles.warningText}>
                  Assurez-vous que l'IBAN saisi est correct et vous appartient.
                </Text>
              </View>
              <View style={styles.warningItem}>
                <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.warningTextDanger}>
                  Toute erreur dans l'IBAN peut entraîner l'envoi des fonds vers un mauvais compte bancaire.
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
              (!walletData || walletData.wallet.available_balance < MINIMUM_WITHDRAWAL) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!walletData || walletData.wallet.available_balance < MINIMUM_WITHDRAWAL}
            data-testid="submit-withdrawal-button"
          >
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>Demander le retrait</Text>
          </TouchableOpacity>

          {/* Processing Info */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              Les retraits sont traités sous 3-5 jours ouvrés par virement SEPA.
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
              <Ionicons name="help-circle" size={48} color="#3B82F6" />
            </View>
            <Text style={styles.modalTitle}>Confirmer le retrait</Text>
            <Text style={styles.modalMessage}>
              Confirmez-vous que votre IBAN est correct ?
            </Text>
            
            <View style={styles.modalDetails}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>IBAN:</Text>
                <Text style={styles.modalDetailValue} data-testid="confirm-iban">{iban}</Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Montant:</Text>
                <Text style={styles.modalDetailValueHighlight} data-testid="confirm-amount">{amount}€</Text>
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
                style={styles.modalConfirmButton}
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
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>Demande envoyée</Text>
            <Text style={styles.successMessage} data-testid="success-message">
              Votre demande de retrait a été envoyée avec succès.
            </Text>
            <Text style={styles.successSubMessage}>
              Le virement sera traité sous 3-5 jours ouvrés.
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
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
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 8,
  },
  balanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceInfoText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
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
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#64748B',
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
    color: '#64748B',
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
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#475569',
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#94A3B8',
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
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
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
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalDetails: {
    width: '100%',
    backgroundColor: '#0F172A',
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
    color: '#64748B',
  },
  modalDetailValue: {
    fontSize: 14,
    color: '#E2E8F0',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalDetailValueHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
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
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  successMessage: {
    fontSize: 16,
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  successSubMessage: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
  },
  successButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
