import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { NEON_COLORS, NeonBackgroundSimple } from '../../src/components/NeonBackground';
import { NeonAlert, useNeonAlert } from '../../src/components/NeonAlert';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  created_at: string;
  is_banned?: boolean;
  is_verified?: boolean;
  dj_profile?: {
    stage_name: string;
    rating: number;
  };
}

export default function AdminUsersPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const { alert, showAlert, hideAlert } = useNeonAlert();

  useEffect(() => {
    if (user?.user_type !== 'admin') {
      router.replace('/');
      return;
    }
    loadUsers();
  }, [user, filter]);

  const loadUsers = async () => {
    try {
      const params = filter ? `?user_type=${filter}` : '';
      const response = await api.get(`/admin/v2/users${params}`);
      setUsers(response.data.users);
    } catch (error) {
      showAlert('error', 'Erreur', 'Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const toggleBan = async (userId: string, isBanned: boolean) => {
    try {
      await api.put(`/admin/v2/users/${userId}/status`, { is_banned: !isBanned });
      showAlert('success', 'Succès', `Utilisateur ${isBanned ? 'débanni' : 'banni'}.`);
      loadUsers();
    } catch (error) {
      showAlert('error', 'Erreur', 'Action impossible.');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await api.delete(`/admin/v2/users/${userId}`);
      showAlert('success', 'Succès', 'Utilisateur supprimé.');
      loadUsers();
    } catch (error) {
      showAlert('error', 'Erreur', 'Suppression impossible.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'dj': return NEON_COLORS.magenta;
      case 'organizer': return NEON_COLORS.cyan;
      case 'admin': return NEON_COLORS.green;
      default: return NEON_COLORS.textSecondary;
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
          <Text style={styles.title}>Utilisateurs</Text>
          <Text style={styles.count}>{users.length}</Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={NEON_COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor={NEON_COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          {['', 'dj', 'organizer'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.filterButtonActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === '' ? 'Tous' : f === 'dj' ? 'DJs' : 'Organisateurs'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NEON_COLORS.cyan} />}
        >
          {filteredUsers.map((u) => (
            <View key={u.id} style={styles.userCard}>
              <View style={styles.userInfo}>
                <View style={styles.userHeader}>
                  <Text style={styles.userName}>{u.first_name} {u.last_name}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: `${getUserTypeColor(u.user_type)}20` }]}>
                    <Text style={[styles.typeText, { color: getUserTypeColor(u.user_type) }]}>
                      {u.user_type.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.userEmail}>{u.email}</Text>
                {u.dj_profile && (
                  <Text style={styles.djInfo}>🎵 {u.dj_profile.stage_name} • {u.dj_profile.rating}⭐</Text>
                )}
                {u.is_banned && (
                  <View style={styles.bannedBadge}>
                    <Ionicons name="ban" size={12} color="#E74C3C" />
                    <Text style={styles.bannedText}>Banni</Text>
                  </View>
                )}
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={[styles.actionButton, u.is_banned ? styles.unbanButton : styles.banButton]}
                  onPress={() => toggleBan(u.id, u.is_banned || false)}
                >
                  <Ionicons name={u.is_banned ? "checkmark" : "ban"} size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteUser(u.id)}
                >
                  <Ionicons name="trash" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: NEON_COLORS.card, marginHorizontal: 16, borderRadius: 12, paddingHorizontal: 16, marginBottom: 12 },
  searchInput: { flex: 1, height: 44, color: '#fff', marginLeft: 8 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: NEON_COLORS.card },
  filterButtonActive: { backgroundColor: NEON_COLORS.cyan },
  filterText: { color: NEON_COLORS.textSecondary, fontSize: 14 },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 16 },
  userCard: { backgroundColor: NEON_COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: NEON_COLORS.cardBorder },
  userInfo: { flex: 1 },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  userName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeText: { fontSize: 10, fontWeight: '700' },
  userEmail: { fontSize: 13, color: NEON_COLORS.textSecondary },
  djInfo: { fontSize: 12, color: NEON_COLORS.magenta, marginTop: 4 },
  bannedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  bannedText: { fontSize: 12, color: '#E74C3C' },
  userActions: { flexDirection: 'row', gap: 8 },
  actionButton: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  banButton: { backgroundColor: '#E74C3C' },
  unbanButton: { backgroundColor: NEON_COLORS.green },
  deleteButton: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#636E72', alignItems: 'center', justifyContent: 'center' },
});
