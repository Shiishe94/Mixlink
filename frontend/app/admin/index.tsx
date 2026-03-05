import React, { useEffect, useState } from 'react';
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
import api from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { NEON_COLORS, NeonBackgroundSimple } from '../../src/components/NeonBackground';
import { NeonAlert, useNeonAlert } from '../../src/components/NeonAlert';

interface AdminStats {
  users: {
    total: number;
    djs: number;
    organizers: number;
    active_djs: number;
  };
  bookings: {
    total: number;
    completed: number;
    pending: number;
    completion_rate: number;
  };
  revenue: {
    total_volume: number;
    platform_commission: number;
  };
  withdrawals: {
    total: number;
    pending: number;
  };
  reviews: {
    total: number;
    average_rating: number;
  };
  events: {
    total: number;
  };
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { alert, showAlert, hideAlert } = useNeonAlert();

  useEffect(() => {
    if (user?.user_type !== 'admin') {
      showAlert('error', 'Accès refusé', 'Vous devez être administrateur pour accéder à cette page.');
      router.replace('/');
      return;
    }
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error: any) {
      showAlert('error', 'Erreur', 'Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color = NEON_COLORS.cyan,
    onPress 
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string;
    icon: string; 
    color?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={styles.statCard}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );

  const MenuCard = ({ 
    title, 
    description, 
    icon, 
    color,
    onPress 
  }: { 
    title: string; 
    description: string;
    icon: string; 
    color: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.menuCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={28} color={color} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={NEON_COLORS.textSecondary} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <NeonBackgroundSimple>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={NEON_COLORS.cyan} />
            <Text style={styles.loadingText}>Chargement du dashboard...</Text>
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
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Gestion de la plateforme</Text>
          </View>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={20} color={NEON_COLORS.magenta} />
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NEON_COLORS.cyan} />
          }
        >
          {/* Stats Overview */}
          <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Utilisateurs"
              value={stats?.users.total || 0}
              subtitle={`${stats?.users.djs || 0} DJs • ${stats?.users.organizers || 0} Orga`}
              icon="people"
              color={NEON_COLORS.cyan}
              onPress={() => router.push('/admin/users')}
            />
            <StatCard
              title="DJs Actifs"
              value={stats?.users.active_djs || 0}
              icon="musical-notes"
              color={NEON_COLORS.magenta}
            />
            <StatCard
              title="Réservations"
              value={stats?.bookings.total || 0}
              subtitle={`${stats?.bookings.completion_rate || 0}% complétées`}
              icon="calendar"
              color={NEON_COLORS.green}
              onPress={() => router.push('/admin/bookings')}
            />
            <StatCard
              title="Commission"
              value={`${(stats?.revenue.platform_commission || 0).toFixed(0)}€`}
              subtitle={`Vol: ${(stats?.revenue.total_volume || 0).toFixed(0)}€`}
              icon="cash"
              color="#F39C12"
            />
            <StatCard
              title="Retraits"
              value={stats?.withdrawals.pending || 0}
              subtitle="en attente"
              icon="wallet"
              color="#E74C3C"
              onPress={() => router.push('/admin/withdrawals')}
            />
            <StatCard
              title="Avis"
              value={stats?.reviews.total || 0}
              subtitle={`${stats?.reviews.average_rating || 0}⭐ moyenne`}
              icon="star"
              color="#9B59B6"
              onPress={() => router.push('/admin/reviews')}
            />
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Gestion</Text>
          <View style={styles.menuSection}>
            <MenuCard
              title="Utilisateurs"
              description="Gérer les DJs et organisateurs"
              icon="people-outline"
              color={NEON_COLORS.cyan}
              onPress={() => router.push('/admin/users')}
            />
            <MenuCard
              title="Modération Avis"
              description="Approuver ou supprimer des avis"
              icon="chatbubbles-outline"
              color="#9B59B6"
              onPress={() => router.push('/admin/reviews')}
            />
            <MenuCard
              title="Retraits"
              description="Gérer les demandes de retrait"
              icon="card-outline"
              color="#E74C3C"
              onPress={() => router.push('/admin/withdrawals')}
            />
            <MenuCard
              title="Réservations"
              description="Voir toutes les réservations"
              icon="calendar-outline"
              color={NEON_COLORS.green}
              onPress={() => router.push('/admin/bookings')}
            />
            <MenuCard
              title="Profils DJ"
              description="Vérifier et mettre en avant des DJs"
              icon="disc-outline"
              color={NEON_COLORS.magenta}
              onPress={() => router.push('/admin/dj-profiles')}
            />
          </View>

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
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: NEON_COLORS.magenta,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
    marginTop: 2,
  },
  adminBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${NEON_COLORS.magenta}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%' as any,
    backgroundColor: NEON_COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: NEON_COLORS.cardBorder,
    minWidth: 140,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 12,
    color: NEON_COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statSubtitle: {
    fontSize: 11,
    color: NEON_COLORS.textSecondary,
    marginTop: 4,
  },
  menuSection: {
    gap: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NEON_COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: NEON_COLORS.cardBorder,
  },
  menuIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  menuDescription: {
    fontSize: 13,
    color: NEON_COLORS.textSecondary,
    marginTop: 2,
  },
  bottomPadding: {
    height: 40,
  },
});
