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
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { djWalletApi } from '../../src/services/api';
import { goBack } from '../../src/utils/navigation';
import { Button } from '../../src/components/Button';
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
  min_withdrawal: number;
}

const MINIMUM_WITHDRAWAL = 50;

const ORIGIN_URL = process.env.EXPO_PUBLIC_BACKEND_URL?.replace('/api', '') || 'https://dj-connect-12.preview.emergentagent.com';

export default function DJWalletScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [activeTab, setActiveTab] = useState('wallet');
  const [earnings, setEarnings] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);

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

  const navigateToWithdrawal = () => {
    router.push('/dj/withdrawal');
  };

  const handleFeaturedPurchase = async () => {
    try {
      setFeaturedLoading(true);
      const originUrl = 'https://dj-connect-12.preview.emergentagent.com';
      const res = await djWalletApi.createFeaturedCheckout(originUrl);
      const { url } = res.data;
      if (url) {
        if (Platform.OS === 'web') {
          window.location.href = url;
        } else {
          await Linking.openURL(url);
        }
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.detail || 'Impossible de créer la session de paiement.');
    } finally {
      setFeaturedLoading(false);
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
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
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
              <Text style={styles.balanceNote}>
                {walletData.wallet.available_balance >= MINIMUM_WITHDRAWAL 
                  ? 'Disponible pour retrait' 
                  : `Minimum ${MINIMUM_WITHDRAWAL}€ requis pour retrait`}
              </Text>
              
              <Button
                title="Retirer des fonds"
                onPress={navigateToWithdrawal}
                disabled={walletData.wallet.available_balance < MINIMUM_WITHDRAWAL}
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

            {/* DJ Vedette Section */}
            <View style={styles.featuredCard} data-testid="featured-dj-section">
              <View style={styles.featuredHeader}>
                <View style={styles.featuredBadge}>
                  <Ionicons name="star" size={20} color="#f59e0b" />
                  <Text style={styles.featuredBadgeText}>DJ VEDETTE</Text>
                </View>
                <Text style={styles.featuredPrice}>49€ / 30 jours</Text>
              </View>
              <Text style={styles.featuredTitle}>Apparaissez en tête des recherches</Text>
              <Text style={styles.featuredDesc}>
                Votre profil sera mis en avant pour tous les organisateurs. Badge exclusif visible sur votre fiche DJ.
              </Text>
              <View style={styles.featuredPerks}>
                {[
                  'Position n°1 dans les résultats',
                  'Badge doré "Vedette" visible',
                  'Visibilité maximale pendant 30 jours',
                ].map((perk, i) => (
                  <View key={i} style={styles.featuredPerk}>
                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    <Text style={styles.featuredPerkText}>{perk}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                data-testid="featured-dj-buy-btn"
                style={styles.featuredButton}
                onPress={handleFeaturedPurchase}
                disabled={featuredLoading}
              >
                {featuredLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="star" size={18} color="#000" />
                    <Text style={styles.featuredButtonText}>Devenir Vedette — 49€</Text>
                  </>
                )}
              </TouchableOpacity>
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
            <View style={styles.withdrawalsSectionHeader}>
              <Text style={styles.sectionTitle}>Historique des retraits</Text>
              <TouchableOpacity
                style={styles.realTimeButton}
                onPress={() => router.push('/dj/withdrawal-history')}
              >
                <Ionicons name="pulse" size={16} color="#00CEC9" />
                <Text style={styles.realTimeButtonText}>Temps réel</Text>
              </TouchableOpacity>
            </View>
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
  withdrawalsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  realTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 206, 201, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 206, 201, 0.3)',
  },
  realTimeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00CEC9',
  },
  bottomPadding: {
    height: 40,
  },
  // DJ Vedette styles
  featuredCard: {
    backgroundColor: '#1a1508',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#f59e0b',
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  featuredBadgeText: {
    color: '#f59e0b',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  featuredPrice: {
    color: '#f59e0b',
    fontWeight: '700',
    fontSize: 16,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  featuredDesc: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
    marginBottom: 16,
  },
  featuredPerks: {
    gap: 8,
    marginBottom: 20,
  },
  featuredPerk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featuredPerkText: {
    color: '#e5e7eb',
    fontSize: 14,
  },
  featuredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 50,
    gap: 8,
  },
  featuredButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
});
