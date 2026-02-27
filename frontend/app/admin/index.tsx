import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://event-djs-1.preview.emergentagent.com';

interface DashboardData {
  wallet: {
    balance: number;
    total_earned: number;
    total_withdrawn: number;
  };
  statistics: {
    total_users: number;
    total_djs: number;
    total_organizers: number;
    total_bookings: number;
    total_paid_bookings: number;
    total_events: number;
    commission_rate: string;
  };
  recent_commissions: any[];
}

export default function AdminScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [commissions, setCommissions] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('admin_token');
    if (token) {
      setIsLoggedIn(true);
      await loadDashboard(token);
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoginLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/admin/login`, {
        email,
        password,
      });
      
      await AsyncStorage.setItem('admin_token', response.data.access_token);
      setIsLoggedIn(true);
      await loadDashboard(response.data.access_token);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Connexion échouée');
    } finally {
      setLoginLoading(false);
    }
  };

  const loadDashboard = async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboard(response.data);
      setCommissions(response.data.recent_commissions || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadCommissions = async () => {
    const token = await AsyncStorage.getItem('admin_token');
    if (!token) return;
    
    try {
      const response = await axios.get(`${API_URL}/api/admin/commissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCommissions(response.data.commissions || []);
    } catch (error) {
      console.error('Error loading commissions:', error);
    }
  };

  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide');
      return;
    }

    if (!bankName || !iban) {
      Alert.alert('Erreur', 'Veuillez remplir les informations bancaires');
      return;
    }

    if (dashboard && amount > dashboard.wallet.balance) {
      Alert.alert('Erreur', 'Solde insuffisant');
      return;
    }

    const token = await AsyncStorage.getItem('admin_token');
    if (!token) return;

    try {
      await axios.post(
        `${API_URL}/api/admin/withdrawal`,
        null,
        {
          params: {
            amount,
            bank_details: JSON.stringify({ bank_name: bankName, iban }),
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      Alert.alert('Succès', 'Demande de retrait soumise avec succès');
      setWithdrawAmount('');
      await loadDashboard(token);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Échec du retrait');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('admin_token');
    setIsLoggedIn(false);
    setDashboard(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const token = await AsyncStorage.getItem('admin_token');
    if (token) {
      await loadDashboard(token);
    }
    setRefreshing(false);
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

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Administration</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.loginContent}>
          <View style={styles.loginCard}>
            <Ionicons name="shield-checkmark" size={60} color="#6C5CE7" />
            <Text style={styles.loginTitle}>Connexion Admin</Text>
            <Text style={styles.loginSubtitle}>Accédez au tableau de bord</Text>

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="admin@djbooking.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
            />

            <Input
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              placeholder="Mot de passe"
              secureTextEntry
              leftIcon="lock-closed"
            />

            <Button
              title="Se connecter"
              onPress={handleLogin}
              loading={loginLoading}
              style={styles.loginButton}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Administration</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#E74C3C" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={activeTab === 'dashboard' ? '#fff' : '#636E72'}
          />
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'commissions' && styles.tabActive]}
          onPress={() => {
            setActiveTab('commissions');
            loadCommissions();
          }}
        >
          <Ionicons
            name="cash"
            size={20}
            color={activeTab === 'commissions' ? '#fff' : '#636E72'}
          />
          <Text style={[styles.tabText, activeTab === 'commissions' && styles.tabTextActive]}>
            Commissions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'withdraw' && styles.tabActive]}
          onPress={() => setActiveTab('withdraw')}
        >
          <Ionicons
            name="wallet"
            size={20}
            color={activeTab === 'withdraw' ? '#fff' : '#636E72'}
          />
          <Text style={[styles.tabText, activeTab === 'withdraw' && styles.tabTextActive]}>
            Retrait
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
        {activeTab === 'dashboard' && dashboard && (
          <>
            {/* Wallet Card */}
            <View style={styles.walletCard}>
              <Text style={styles.walletLabel}>Solde disponible</Text>
              <Text style={styles.walletBalance}>{dashboard.wallet.balance.toFixed(2)}€</Text>
              <View style={styles.walletStats}>
                <View style={styles.walletStat}>
                  <Text style={styles.walletStatLabel}>Total gagné</Text>
                  <Text style={styles.walletStatValue}>{dashboard.wallet.total_earned.toFixed(2)}€</Text>
                </View>
                <View style={styles.walletStatDivider} />
                <View style={styles.walletStat}>
                  <Text style={styles.walletStatLabel}>Total retiré</Text>
                  <Text style={styles.walletStatValue}>{dashboard.wallet.total_withdrawn.toFixed(2)}€</Text>
                </View>
              </View>
            </View>

            {/* Commission Rate */}
            <View style={styles.rateCard}>
              <Ionicons name="trending-up" size={24} color="#00B894" />
              <Text style={styles.rateText}>Taux de commission: {dashboard.statistics.commission_rate}</Text>
              <Text style={styles.rateSubtext}>(7.5% DJ + 7.5% Organisateur)</Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="people" size={28} color="#6C5CE7" />
                <Text style={styles.statValue}>{dashboard.statistics.total_users}</Text>
                <Text style={styles.statLabel}>Utilisateurs</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="disc" size={28} color="#00B894" />
                <Text style={styles.statValue}>{dashboard.statistics.total_djs}</Text>
                <Text style={styles.statLabel}>DJs</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="calendar" size={28} color="#F39C12" />
                <Text style={styles.statValue}>{dashboard.statistics.total_events}</Text>
                <Text style={styles.statLabel}>Événements</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={28} color="#3498DB" />
                <Text style={styles.statValue}>{dashboard.statistics.total_paid_bookings}</Text>
                <Text style={styles.statLabel}>Réservations payées</Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'commissions' && (
          <View style={styles.commissionsSection}>
            <Text style={styles.sectionTitle}>Historique des commissions</Text>
            {commissions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cash-outline" size={60} color="#636E72" />
                <Text style={styles.emptyText}>Aucune commission</Text>
              </View>
            ) : (
              commissions.map((commission) => (
                <View key={commission.id} style={styles.commissionCard}>
                  <View style={styles.commissionHeader}>
                    <Text style={styles.commissionAmount}>+{commission.total_commission?.toFixed(2) || 0}€</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: commission.status === 'credited' ? '#00B894' : '#F39C12' }
                    ]}>
                      <Text style={styles.statusText}>
                        {commission.status === 'credited' ? 'Crédité' : 'En attente'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.commissionEvent}>
                    {commission.event_title || 'Événement'}
                  </Text>
                  <View style={styles.commissionDetails}>
                    <Text style={styles.commissionDetail}>
                      DJ: {commission.dj_commission?.toFixed(2) || 0}€
                    </Text>
                    <Text style={styles.commissionDetail}>
                      Org: {commission.organizer_commission?.toFixed(2) || 0}€
                    </Text>
                  </View>
                  <Text style={styles.commissionDate}>
                    {commission.created_at ? 
                      format(new Date(commission.created_at), 'd MMM yyyy HH:mm', { locale: fr }) 
                      : 'N/A'}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'withdraw' && (
          <View style={styles.withdrawSection}>
            <Text style={styles.sectionTitle}>Demande de retrait</Text>
            
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Solde disponible</Text>
              <Text style={styles.balanceValue}>{dashboard?.wallet.balance.toFixed(2) || 0}€</Text>
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

            <View style={styles.withdrawNote}>
              <Ionicons name="information-circle" size={20} color="#F39C12" />
              <Text style={styles.withdrawNoteText}>
                Les retraits sont traités sous 3-5 jours ouvrés.
                Un email de confirmation vous sera envoyé.
              </Text>
            </View>

            <Button
              title="Demander le retrait"
              onPress={handleWithdrawal}
              disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
            />
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
  loginContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 24,
  },
  loginButton: {
    width: '100%',
    marginTop: 8,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: '#6C5CE7',
  },
  tabText: {
    fontSize: 12,
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
  walletCard: {
    backgroundColor: '#6C5CE7',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  walletLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  walletBalance: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  walletStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  walletStat: {
    alignItems: 'center',
  },
  walletStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  walletStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  walletStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  rateCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  rateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  rateSubtext: {
    fontSize: 12,
    color: '#636E72',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  commissionsSection: {
    flex: 1,
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
  commissionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  commissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commissionAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00B894',
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
  commissionEvent: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
  },
  commissionDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  commissionDetail: {
    fontSize: 14,
    color: '#B2BEC3',
  },
  commissionDate: {
    fontSize: 12,
    color: '#636E72',
  },
  withdrawSection: {
    flex: 1,
  },
  balanceInfo: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00B894',
  },
  withdrawNote: {
    flexDirection: 'row',
    backgroundColor: '#2D3436',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  withdrawNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#B2BEC3',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
