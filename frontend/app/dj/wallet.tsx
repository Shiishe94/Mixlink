import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { djWalletApi } from '../../src/services/api';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WalletData {
  wallet: {
    pending_balance: number;
    available_balance: number;
    total_earned: number;
    total_withdrawn: number;
  };
  pending_earnings: any[];
}

export default function DJWalletScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [activeTab, setActiveTab] = useState('wallet');
  const [earnings, setEarnings] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const walletRes = await djWalletApi.getWallet();
      setWalletData(walletRes.data);
      
      const earningsRes = await djWalletApi.getEarnings();
      setEarnings(earningsRes.data);
      
      const withdrawalsRes = await djWalletApi.getWithdrawals();
      setWithdrawals(withdrawalsRes.data);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    if (!bankName || !iban) {
      Alert.alert('Erreur', 'Veuillez remplir les informations bancaires');
      return;
    }

    if (walletData && amount > walletData.wallet.available_balance) {
      Alert.alert('Erreur', 'Solde disponible insuffisant. Les fonds en attente ne peuvent pas être retirés.');
      return;
    }

    setWithdrawLoading(true);
    try {
      await djWalletApi.requestWithdrawal(amount, bankName, iban);
      Alert.alert('Succès', 'Demande de retrait soumise avec succès');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      await loadData();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Échec du retrait');
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Portefeuille</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wallet' && styles.tabActive]}
          onPress={() => setActiveTab('wallet')}
        >
          <Text style={[styles.tabText, activeTab === 'wallet' && styles.tabTextActive]}>
            Solde
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'earnings' && styles.tabActive]}
          onPress={() => setActiveTab('earnings')}
        >
          <Text style={[styles.tabText, activeTab === 'earnings' && styles.tabTextActive]}>
            Gains
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'withdrawals' && styles.tabActive]}
          onPress={() => setActiveTab('withdrawals')}
        >
          <Text style={[styles.tabText, activeTab === 'withdrawals' && styles.tabTextActive]}>
            Retraits
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />
        }
      >
        {activeTab === 'wallet' && walletData && (
          <>
            {/* Available Balance Card */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Solde disponible</Text>
              <Text style={styles.balanceValue}>
                {walletData.wallet.available_balance.toFixed(2)}€
              </Text>
              <Text style={styles.balanceNote}>Disponible pour retrait</Text>
              
              <Button
                title="Retirer des fonds"
                onPress={() => setShowWithdrawModal(true)}
                disabled={walletData.wallet.available_balance <= 0}
                style={styles.withdrawButton}
              />
            </View>

            {/* Pending Balance Card */}
            <View style={styles.pendingCard}>
              <View style={styles.pendingHeader}>
                <Ionicons name="time" size={24} color="#F39C12" />
                <Text style={styles.pendingTitle}>Fonds en attente</Text>
              </View>
              <Text style={styles.pendingAmount}>
                {walletData.wallet.pending_balance.toFixed(2)}€
              </Text>
              <Text style={styles.pendingNote}>
                Ces fonds seront disponibles après confirmation de la prestation par l'organisateur
              </Text>
            </View>

            {/* Pending Earnings List */}
            {walletData.pending_earnings.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Prestations en attente</Text>
                {walletData.pending_earnings.map((earning: any) => (
                  <View key={earning.id} style={styles.earningCard}>
                    <View style={styles.earningHeader}>
                      <Text style={styles.earningAmount}>{earning.amount.toFixed(2)}€</Text>
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>En attente</Text>
                      </View>
                    </View>
                    <Text style={styles.earningEvent}>{earning.event_title || 'Événement'}</Text>
                    <Text style={styles.earningDate}>
                      Date de l'événement: {earning.event_date}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{walletData.wallet.total_earned.toFixed(2)}€</Text>
                <Text style={styles.statLabel}>Total gagné</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{walletData.wallet.total_withdrawn.toFixed(2)}€</Text>
                <Text style={styles.statLabel}>Total retiré</Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'earnings' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historique des gains</Text>
            {earnings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cash-outline" size={60} color="#636E72" />
                <Text style={styles.emptyText}>Aucun gain</Text>
              </View>
            ) : (
              earnings.map((earning: any) => (
                <View key={earning.id} style={styles.earningCard}>
                  <View style={styles.earningHeader}>
                    <Text style={styles.earningAmount}>{earning.amount.toFixed(2)}€</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: earning.status === 'released' ? '#00B894' : '#F39C12' }
                    ]}>
                      <Text style={styles.statusText}>
                        {earning.status === 'released' ? 'Disponible' : earning.status === 'withdrawn' ? 'Retiré' : 'En attente'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.earningEvent}>{earning.event_title || 'Événement'}</Text>
                  {earning.organizer_name && (
                    <Text style={styles.earningOrganizer}>Organisateur: {earning.organizer_name}</Text>
                  )}
                  <Text style={styles.earningDate}>
                    {earning.created_at ? format(new Date(earning.created_at), 'd MMM yyyy', { locale: fr }) : 'N/A'}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'withdrawals' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historique des retraits</Text>
            {withdrawals.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={60} color="#636E72" />
                <Text style={styles.emptyText}>Aucun retrait</Text>
              </View>
            ) : (
              withdrawals.map((withdrawal: any) => (
                <View key={withdrawal.id} style={styles.withdrawalCard}>
                  <View style={styles.withdrawalHeader}>
                    <Text style={styles.withdrawalAmount}>-{withdrawal.amount.toFixed(2)}€</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: withdrawal.status === 'completed' ? '#00B894' : withdrawal.status === 'pending' ? '#F39C12' : '#636E72' }
                    ]}>
                      <Text style={styles.statusText}>
                        {withdrawal.status === 'completed' ? 'Effectué' : withdrawal.status === 'pending' ? 'En cours' : 'Rejeté'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.withdrawalBank}>
                    {withdrawal.bank_details?.bank_name || 'Banque non spécifiée'}
                  </Text>
                  <Text style={styles.withdrawalDate}>
                    {withdrawal.created_at ? format(new Date(withdrawal.created_at), 'd MMM yyyy HH:mm', { locale: fr }) : 'N/A'}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Retirer des fonds</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBalance}>
              <Text style={styles.modalBalanceLabel}>Solde disponible</Text>
              <Text style={styles.modalBalanceValue}>
                {walletData?.wallet.available_balance.toFixed(2) || 0}€
              </Text>
            </View>

            <Input
              label="Montant à retirer (€)"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
              placeholder="100.00"
              leftIcon="cash"
            />

            <Input
              label="Nom de la banque"
              value={bankName}
              onChangeText={setBankName}
              placeholder="BNP Paribas"
              leftIcon="business"
            />

            <Input
              label="IBAN"
              value={iban}
              onChangeText={setIban}
              placeholder="FR76 1234 5678 9012 3456 7890 123"
              autoCapitalize="characters"
              leftIcon="card"
            />

            <View style={styles.modalNote}>
              <Ionicons name="information-circle" size={20} color="#F39C12" />
              <Text style={styles.modalNoteText}>
                Les retraits sont traités sous 3-5 jours ouvrés.
              </Text>
            </View>

            <Button
              title="Confirmer le retrait"
              onPress={handleWithdraw}
              loading={withdrawLoading}
              disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
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
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerRight: {
    width: 44,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: '#6C5CE7',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#636E72',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  balanceCard: {
    backgroundColor: '#00B894',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  balanceNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 20,
  },
  withdrawButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: '100%',
  },
  pendingCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F39C12',
  },
  pendingAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  pendingNote: {
    fontSize: 12,
    color: '#636E72',
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  earningCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  earningAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00B894',
  },
  earningEvent: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  earningOrganizer: {
    fontSize: 14,
    color: '#B2BEC3',
    marginBottom: 4,
  },
  earningDate: {
    fontSize: 12,
    color: '#636E72',
  },
  pendingBadge: {
    backgroundColor: '#F39C12',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#636E72',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#636E72',
    marginTop: 16,
  },
  withdrawalCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  withdrawalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  withdrawalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E74C3C',
  },
  withdrawalBank: {
    fontSize: 14,
    color: '#B2BEC3',
    marginBottom: 4,
  },
  withdrawalDate: {
    fontSize: 12,
    color: '#636E72',
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalBalance: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalBalanceLabel: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 8,
  },
  modalBalanceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00B894',
  },
  modalNote: {
    flexDirection: 'row',
    backgroundColor: '#2D3436',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  modalNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#B2BEC3',
  },
});
