import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
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
  created_at: string;
  user?: { first_name: string; last_name: string; email: string };
  dj_profile?: { stage_name: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: '#F39C12', icon: 'time-outline' },
  processing: { label: 'En cours', color: NEON_COLORS.cyan, icon: 'sync-outline' },
  completed: { label: 'Effectué', color: NEON_COLORS.green, icon: 'checkmark-circle' },
  rejected: { label: 'Rejeté', color: '#E74C3C', icon: 'close-circle' },
};

export default function AdminWithdrawalsPage() {
  const { user } = useAuthStore();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('');
  const { alert, showAlert, hideAlert } = useNeonAlert();

  useEffect(() => {
    if (user?.user_type !== 'admin') {
      router.replace('/');
      return;
    }
    loadWithdrawals();
  }, [user, filter]);

  const loadWithdrawals = async () => {
    try {
      const params = filter ? `?status=${filter}` : '';
      const response = await api.get(`/admin/v2/withdrawals${params}`);
      setWithdrawals(response.data.withdrawals);
    } catch (error) {
      showAlert('error', 'Erreur', 'Impossible de charger les retraits.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWithdrawals();
    setRefreshing(false);
  };

  const updateStatus = async (withdrawalId: string, newStatus: string) => {
    try {
      await api.put(`/admin/v2/withdrawals/${withdrawalId}`, { status: newStatus });
      showAlert('success', 'Succès', `Retrait marqué comme ${STATUS_CONFIG[newStatus]?.label || newStatus}.`);
      loadWithdrawals();
    } catch (error) {
      showAlert('error', 'Erreur', 'Mise à jour impossible.');
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Retraits</Text>
          <Text style={styles.count}>{withdrawals.length}</Text>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterContainer}>
            {['', 'pending', 'processing', 'completed', 'rejected'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterButton, filter === f && styles.filterButtonActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f === '' ? 'Tous' : STATUS_CONFIG[f]?.label || f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NEON_COLORS.cyan} />}
        >
          {withdrawals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={NEON_COLORS.textSecondary} />
              <Text style={styles.emptyText}>Aucun retrait</Text>
            </View>
          ) : (
            withdrawals.map((w) => {
              const statusConfig = STATUS_CONFIG[w.status] || STATUS_CONFIG.pending;
              return (
                <View key={w.id} style={styles.withdrawalCard}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.djName}>{w.dj_profile?.stage_name || w.user?.first_name || 'DJ'}</Text>
                      <Text style={styles.userEmail}>{w.user?.email}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]}>
                      <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
                      <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Montant</Text>
                      <Text style={styles.amount}>{w.amount.toFixed(2)}€</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Méthode</Text>
                      <Text style={styles.detailValue}>{w.method === 'paypal' ? 'PayPal' : 'IBAN'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {format(new Date(w.created_at), 'd MMM yyyy HH:mm', { locale: fr })}
                      </Text>
                    </View>
                  </View>

                  {w.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => updateStatus(w.id, 'completed')}
                      >
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Approuver</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => updateStatus(w.id, 'rejected')}
                      >
                        <Ionicons name="close" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Rejeter</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>

        <NeonAlert visible={alert.visible} type={alert.type} title={alert.title} message={alert.message} onClose={hideAlert} />
      </SafeAreaView>
    </NeonBackgroundSimple>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: NEON_COLORS.card, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff', marginLeft: 16 },
  count: { fontSize: 16, color: NEON_COLORS.cyan, fontWeight: '600' },
  filterScroll: { maxHeight: 50 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: NEON_COLORS.card },
  filterButtonActive: { backgroundColor: NEON_COLORS.cyan },
  filterText: { color: NEON_COLORS.textSecondary, fontSize: 14 },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: NEON_COLORS.textSecondary, marginTop: 12 },
  withdrawalCard: { backgroundColor: NEON_COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: NEON_COLORS.cardBorder },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  djName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  userEmail: { fontSize: 12, color: NEON_COLORS.textSecondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardBody: { borderTopWidth: 1, borderTopColor: NEON_COLORS.cardBorder, paddingTop: 12 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  amountLabel: { fontSize: 14, color: NEON_COLORS.textSecondary },
  amount: { fontSize: 24, fontWeight: '700', color: NEON_COLORS.green },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  detailLabel: { fontSize: 13, color: NEON_COLORS.textSecondary },
  detailValue: { fontSize: 13, color: '#fff' },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: NEON_COLORS.cardBorder, paddingTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  approveBtn: { backgroundColor: NEON_COLORS.green },
  rejectBtn: { backgroundColor: '#E74C3C' },
  actionBtnText: { color: '#fff', fontWeight: '600' },
});
