import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { djWalletApi } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { NEON_COLORS, NeonBackgroundSimple } from '../../src/components/NeonBackground';
import { NeonAlert, useNeonAlert } from '../../src/components/NeonAlert';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Withdrawal {
  id: string;
  amount: number;
  method: string;
  status: string;
  payout_details?: {
    bank_name?: string;
    iban?: string;
    paypal_email?: string;
    paypal_batch_id?: string;
  };
  transaction_id?: string;
  created_at: string;
  processed_at?: string;
  completed_at?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: '#F39C12', icon: 'time-outline' },
  processing: { label: 'En cours', color: NEON_COLORS.cyan, icon: 'sync-outline' },
  completed: { label: 'Effectué', color: NEON_COLORS.green, icon: 'checkmark-circle' },
  rejected: { label: 'Rejeté', color: '#E74C3C', icon: 'close-circle' },
};

export default function WithdrawalHistoryScreen() {
  const { user } = useAuthStore();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const { alert, showAlert, hideAlert } = useNeonAlert();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation for processing status
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  // Load withdrawals from API
  const loadWithdrawals = useCallback(async () => {
    try {
      const response = await djWalletApi.getWithdrawals();
      setWithdrawals(response.data);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
      showAlert('error', 'Erreur', 'Impossible de charger l\'historique des retraits.');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  // Connect to WebSocket for real-time updates
  const connectWebSocket = useCallback(() => {
    if (!user?.id) return;

    const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
    const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const fullWsUrl = `${wsUrl}/ws/${user.id}`;

    console.log('Connecting to WebSocket:', fullWsUrl);

    try {
      wsRef.current = new WebSocket(fullWsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message:', data);

          if (data.type === 'withdrawal_update') {
            // Update the specific withdrawal in the list
            setWithdrawals((prev) =>
              prev.map((w) =>
                w.id === data.withdrawal.id ? { ...w, ...data.withdrawal } : w
              )
            );

            // Show notification
            const status = STATUS_CONFIG[data.withdrawal.status];
            showAlert(
              data.withdrawal.status === 'completed' ? 'success' : 
              data.withdrawal.status === 'rejected' ? 'error' : 'info',
              'Mise à jour du retrait',
              `Votre retrait de ${data.withdrawal.amount}€ est maintenant: ${status?.label || data.withdrawal.status}`
            );
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [user?.id, showAlert]);

  useEffect(() => {
    loadWithdrawals();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [loadWithdrawals, connectWebSocket]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWithdrawals();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMMM yyyy 'à' HH:mm", { locale: fr });
    } catch {
      return dateString;
    }
  };

  const renderWithdrawalCard = (withdrawal: Withdrawal) => {
    const statusConfig = STATUS_CONFIG[withdrawal.status] || STATUS_CONFIG.pending;
    const isProcessing = withdrawal.status === 'processing';
    const isPayPal = withdrawal.method === 'paypal';

    return (
      <View key={withdrawal.id} style={styles.withdrawalCard} data-testid={`withdrawal-${withdrawal.id}`}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.methodBadge}>
            <Ionicons
              name={isPayPal ? 'logo-paypal' : 'card-outline'}
              size={18}
              color={isPayPal ? '#003087' : NEON_COLORS.cyan}
            />
            <Text style={styles.methodText}>
              {isPayPal ? 'PayPal' : 'Virement IBAN'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]}>
            {isProcessing ? (
              <Animated.View style={pulseStyle}>
                <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
              </Animated.View>
            ) : (
              <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
            )}
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Montant</Text>
          <Text style={styles.amount}>{withdrawal.amount.toFixed(2)}€</Text>
        </View>

        {/* Details */}
        <View style={styles.detailsSection}>
          {isPayPal && withdrawal.payout_details?.paypal_email && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email PayPal</Text>
              <Text style={styles.detailValue}>{withdrawal.payout_details.paypal_email}</Text>
            </View>
          )}
          {!isPayPal && withdrawal.payout_details?.iban && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>IBAN</Text>
              <Text style={styles.detailValue}>
                {withdrawal.payout_details.iban.slice(0, 4)}****{withdrawal.payout_details.iban.slice(-4)}
              </Text>
            </View>
          )}
          {withdrawal.transaction_id && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction</Text>
              <Text style={styles.detailValue}>{withdrawal.transaction_id.slice(0, 12)}...</Text>
            </View>
          )}
        </View>

        {/* Dates */}
        <View style={styles.datesSection}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={NEON_COLORS.textSecondary} />
            <Text style={styles.dateText}>Demandé: {formatDate(withdrawal.created_at)}</Text>
          </View>
          {withdrawal.completed_at && (
            <View style={styles.dateRow}>
              <Ionicons name="checkmark-done-outline" size={14} color={NEON_COLORS.green} />
              <Text style={[styles.dateText, { color: NEON_COLORS.green }]}>
                Complété: {formatDate(withdrawal.completed_at)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <NeonBackgroundSimple>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={NEON_COLORS.cyan} />
            <Text style={styles.loadingText}>Chargement de l'historique...</Text>
          </View>
        </SafeAreaView>
      </NeonBackgroundSimple>
    );
  }

  return (
    <NeonBackgroundSimple>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Historique des retraits</Text>
          <View style={styles.wsIndicator}>
            <View style={[styles.wsStatus, wsConnected && styles.wsStatusConnected]} />
          </View>
        </View>

        {/* WebSocket Status Banner */}
        <View style={[styles.wsBanner, wsConnected ? styles.wsBannerConnected : styles.wsBannerDisconnected]}>
          <Ionicons
            name={wsConnected ? 'wifi' : 'wifi-outline'}
            size={16}
            color={wsConnected ? NEON_COLORS.green : NEON_COLORS.magenta}
          />
          <Text style={[styles.wsBannerText, { color: wsConnected ? NEON_COLORS.green : NEON_COLORS.magenta }]}>
            {wsConnected ? 'Mises à jour en temps réel actives' : 'Connexion en cours...'}
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NEON_COLORS.cyan} />
          }
        >
          {withdrawals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={64} color={NEON_COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Aucun retrait</Text>
              <Text style={styles.emptySubtitle}>
                Vos demandes de retrait apparaîtront ici avec leur statut en temps réel.
              </Text>
              <TouchableOpacity
                style={styles.withdrawButton}
                onPress={() => router.push('/dj/withdrawal')}
              >
                <LinearGradient
                  colors={[NEON_COLORS.cyan, NEON_COLORS.magenta]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.withdrawButtonGradient}
                >
                  <Text style={styles.withdrawButtonText}>Faire un retrait</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Stats Summary */}
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{withdrawals.length}</Text>
                  <Text style={styles.statLabel}>Total retraits</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: NEON_COLORS.green }]}>
                    {withdrawals.filter((w) => w.status === 'completed').length}
                  </Text>
                  <Text style={styles.statLabel}>Complétés</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, { color: NEON_COLORS.cyan }]}>
                    {withdrawals.filter((w) => w.status === 'processing' || w.status === 'pending').length}
                  </Text>
                  <Text style={styles.statLabel}>En cours</Text>
                </View>
              </View>

              {/* Withdrawals List */}
              {withdrawals.map(renderWithdrawalCard)}
            </>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        <NeonAlert
          visible={alert.visible}
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={hideAlert}
        />
      </SafeAreaView>
    </NeonBackgroundSimple>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: NEON_COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: NEON_COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 16,
    textShadowColor: NEON_COLORS.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  wsIndicator: {
    padding: 8,
  },
  wsStatus: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: NEON_COLORS.magenta,
  },
  wsStatusConnected: {
    backgroundColor: NEON_COLORS.green,
  },
  wsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
  },
  wsBannerConnected: {
    backgroundColor: `${NEON_COLORS.green}15`,
    borderWidth: 1,
    borderColor: `${NEON_COLORS.green}30`,
  },
  wsBannerDisconnected: {
    backgroundColor: `${NEON_COLORS.magenta}15`,
    borderWidth: 1,
    borderColor: `${NEON_COLORS.magenta}30`,
  },
  wsBannerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: NEON_COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: NEON_COLORS.cardBorder,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: NEON_COLORS.textSecondary,
    marginTop: 4,
  },
  withdrawalCard: {
    backgroundColor: NEON_COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: NEON_COLORS.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: NEON_COLORS.cardBorder,
  },
  amountLabel: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
  },
  amount: {
    fontSize: 28,
    fontWeight: '700',
    color: NEON_COLORS.green,
    textShadowColor: NEON_COLORS.green,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  detailsSection: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: NEON_COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  datesSection: {
    backgroundColor: NEON_COLORS.background,
    borderRadius: 8,
    padding: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: NEON_COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  withdrawButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  withdrawButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomPadding: {
    height: 20,
  },
});
