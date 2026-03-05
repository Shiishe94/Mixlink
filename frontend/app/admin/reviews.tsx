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

interface Review {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  is_flagged?: boolean;
  is_hidden?: boolean;
  organizer?: { first_name: string; last_name: string; email: string };
  dj?: { stage_name: string };
}

export default function AdminReviewsPage() {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { alert, showAlert, hideAlert } = useNeonAlert();

  useEffect(() => {
    if (user?.user_type !== 'admin') {
      router.replace('/');
      return;
    }
    loadReviews();
  }, [user]);

  const loadReviews = async () => {
    try {
      const response = await api.get('/admin/v2/reviews');
      setReviews(response.data.reviews);
    } catch (error) {
      showAlert('error', 'Erreur', 'Impossible de charger les avis.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };

  const toggleFlag = async (reviewId: string, isFlagged: boolean) => {
    try {
      await api.put(`/admin/v2/reviews/${reviewId}`, { is_flagged: !isFlagged });
      showAlert('success', 'Succès', `Avis ${isFlagged ? 'déflagué' : 'flagué'}.`);
      loadReviews();
    } catch (error) {
      showAlert('error', 'Erreur', 'Action impossible.');
    }
  };

  const toggleHide = async (reviewId: string, isHidden: boolean) => {
    try {
      await api.put(`/admin/v2/reviews/${reviewId}`, { is_hidden: !isHidden });
      showAlert('success', 'Succès', `Avis ${isHidden ? 'affiché' : 'masqué'}.`);
      loadReviews();
    } catch (error) {
      showAlert('error', 'Erreur', 'Action impossible.');
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      await api.delete(`/admin/v2/reviews/${reviewId}`);
      showAlert('success', 'Succès', 'Avis supprimé.');
      loadReviews();
    } catch (error) {
      showAlert('error', 'Erreur', 'Suppression impossible.');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? 'star' : 'star-outline'}
        size={16}
        color={i < rating ? '#F39C12' : NEON_COLORS.textSecondary}
      />
    ));
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
          <Text style={styles.title}>Modération Avis</Text>
          <Text style={styles.count}>{reviews.length}</Text>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NEON_COLORS.cyan} />}
        >
          {reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color={NEON_COLORS.textSecondary} />
              <Text style={styles.emptyText}>Aucun avis</Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={[styles.reviewCard, review.is_flagged && styles.flaggedCard]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.djName}>🎵 {review.dj?.stage_name || 'DJ inconnu'}</Text>
                    <Text style={styles.reviewerName}>
                      Par {review.organizer?.first_name} {review.organizer?.last_name}
                    </Text>
                  </View>
                  <View style={styles.ratingContainer}>
                    {renderStars(review.rating)}
                  </View>
                </View>

                {review.comment && (
                  <Text style={styles.comment}>"{review.comment}"</Text>
                )}

                <View style={styles.metaRow}>
                  <Text style={styles.date}>
                    {format(new Date(review.created_at), 'd MMM yyyy', { locale: fr })}
                  </Text>
                  {review.is_flagged && (
                    <View style={styles.flagBadge}>
                      <Ionicons name="flag" size={12} color="#E74C3C" />
                      <Text style={styles.flagText}>Flagué</Text>
                    </View>
                  )}
                  {review.is_hidden && (
                    <View style={styles.hiddenBadge}>
                      <Ionicons name="eye-off" size={12} color={NEON_COLORS.textSecondary} />
                      <Text style={styles.hiddenText}>Masqué</Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, review.is_flagged ? styles.unflagBtn : styles.flagBtn]}
                    onPress={() => toggleFlag(review.id, review.is_flagged || false)}
                  >
                    <Ionicons name="flag" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, review.is_hidden ? styles.showBtn : styles.hideBtn]}
                    onPress={() => toggleHide(review.id, review.is_hidden || false)}
                  >
                    <Ionicons name={review.is_hidden ? "eye" : "eye-off"} size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => deleteReview(review.id)}
                  >
                    <Ionicons name="trash" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
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
  content: { flex: 1, paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: NEON_COLORS.textSecondary, marginTop: 12 },
  reviewCard: { backgroundColor: NEON_COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: NEON_COLORS.cardBorder },
  flaggedCard: { borderColor: '#E74C3C' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  djName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  reviewerName: { fontSize: 12, color: NEON_COLORS.textSecondary, marginTop: 2 },
  ratingContainer: { flexDirection: 'row', gap: 2 },
  comment: { fontSize: 14, color: NEON_COLORS.textSecondary, fontStyle: 'italic', marginBottom: 12, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  date: { fontSize: 12, color: NEON_COLORS.textSecondary },
  flagBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(231, 76, 60, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  flagText: { fontSize: 11, color: '#E74C3C' },
  hiddenBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: NEON_COLORS.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  hiddenText: { fontSize: 11, color: NEON_COLORS.textSecondary },
  actionButtons: { flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: NEON_COLORS.cardBorder, paddingTop: 12 },
  actionBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  flagBtn: { backgroundColor: '#E74C3C' },
  unflagBtn: { backgroundColor: NEON_COLORS.green },
  hideBtn: { backgroundColor: '#636E72' },
  showBtn: { backgroundColor: NEON_COLORS.cyan },
  deleteBtn: { backgroundColor: '#636E72' },
});
