import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { bookingApi, paymentApi, reviewApi } from '../../src/services/api';
import { Booking } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/Button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F39C12',
  accepted: '#00B894',
  rejected: '#E74C3C',
  paid: '#3498DB',
  completed: '#9B59B6',
  cancelled: '#636E72',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  rejected: 'Refusée',
  paid: 'Payée',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'simulated'>('simulated');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const isDJ = user?.user_type === 'dj';
  const isOrganizer = user?.user_type === 'organizer';

  useEffect(() => {
    loadBooking();
  }, [id]);

  const loadBooking = async () => {
    try {
      const res = await bookingApi.getOne(id!);
      setBooking(res.data);
    } catch (error) {
      console.error('Error loading booking:', error);
      Alert.alert('Erreur', 'Impossible de charger la réservation');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    setActionLoading(true);
    try {
      await bookingApi.updateStatus(id!, status);
      await loadBooking();
      Alert.alert('Succès', `Réservation ${status === 'accepted' ? 'acceptée' : status === 'rejected' ? 'refusée' : 'annulée'}`);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Action impossible');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayment = async () => {
    setActionLoading(true);
    try {
      await paymentApi.process({
        booking_id: id!,
        payment_method: paymentMethod,
        amount: booking!.total_amount,
      });
      await loadBooking();
      setShowPaymentModal(false);
      Alert.alert('Succès', 'Paiement effectué (simulé)');
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Paiement échoué');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewComment.trim()) {
      Alert.alert('Erreur', 'Veuillez ajouter un commentaire');
      return;
    }

    setActionLoading(true);
    try {
      await reviewApi.create({
        dj_id: booking!.dj_id,
        booking_id: id!,
        rating: reviewRating,
        comment: reviewComment,
      });
      setShowReviewModal(false);
      Alert.alert('Succès', 'Avis publié !');
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de publier l\'avis');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = () => {
    if (!booking) return;
    const partnerId = isDJ ? booking.organizer_id : booking.dj?.user?.first_name ? booking.dj_id : null;
    // Get the user_id of the DJ for messaging
    router.push(`/messages/${booking.organizer_id}`);
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

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Réservation non trouvée</Text>
          <Button title="Retour" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLORS[booking.status] || '#636E72';
  const statusLabel = STATUS_LABELS[booking.status] || booking.status;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de la réservation</Text>
        <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
          <Ionicons name="chatbubble" size={20} color="#6C5CE7" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
          <Text style={styles.amount}>{booking.total_amount}€</Text>
        </View>

        {/* Event Info */}
        {booking.event && (
          <TouchableOpacity
            style={styles.eventCard}
            onPress={() => router.push(`/event/${booking.event!.id}`)}
          >
            <Text style={styles.cardTitle}>Événement</Text>
            <Text style={styles.eventTitle}>{booking.event.title}</Text>
            <View style={styles.eventMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar" size={16} color="#636E72" />
                <Text style={styles.metaText}>
                  {format(new Date(booking.event.date), 'd MMMM yyyy', { locale: fr })}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="location" size={16} color="#636E72" />
                <Text style={styles.metaText}>{booking.event.city}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* DJ Info (for organizer) */}
        {isOrganizer && booking.dj && (
          <TouchableOpacity
            style={styles.djCard}
            onPress={() => router.push(`/dj/${booking.dj!.id}`)}
          >
            <Text style={styles.cardTitle}>DJ</Text>
            <Text style={styles.djName}>{booking.dj.artist_name}</Text>
            {booking.dj.user && (
              <Text style={styles.djRealName}>
                {booking.dj.user.first_name} {booking.dj.user.last_name}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Organizer Info (for DJ) */}
        {isDJ && booking.organizer && (
          <View style={styles.organizerCard}>
            <Text style={styles.cardTitle}>Organisateur</Text>
            <Text style={styles.organizerName}>
              {booking.organizer.first_name} {booking.organizer.last_name}
            </Text>
          </View>
        )}

        {/* Message */}
        {booking.message && (
          <View style={styles.messageSection}>
            <Text style={styles.cardTitle}>Message</Text>
            <Text style={styles.messageText}>{booking.message}</Text>
          </View>
        )}

        {/* Dates */}
        <View style={styles.datesSection}>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Créée le</Text>
            <Text style={styles.dateValue}>
              {format(new Date(booking.created_at), 'd MMMM yyyy à HH:mm', { locale: fr })}
            </Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Mise à jour</Text>
            <Text style={styles.dateValue}>
              {format(new Date(booking.updated_at), 'd MMMM yyyy à HH:mm', { locale: fr })}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {/* DJ Actions */}
          {isDJ && booking.status === 'pending' && (
            <>
              <Button
                title="Accepter"
                onPress={() => handleStatusUpdate('accepted')}
                loading={actionLoading}
                style={styles.acceptButton}
              />
              <Button
                title="Refuser"
                variant="danger"
                onPress={() => handleStatusUpdate('rejected')}
                loading={actionLoading}
              />
            </>
          )}

          {/* Organizer Actions */}
          {isOrganizer && booking.status === 'accepted' && (
            <Button
              title="Procéder au paiement"
              onPress={() => setShowPaymentModal(true)}
              icon={<Ionicons name="card" size={20} color="#fff" />}
            />
          )}

          {isOrganizer && booking.status === 'pending' && (
            <Button
              title="Annuler la demande"
              variant="danger"
              onPress={() => handleStatusUpdate('cancelled')}
              loading={actionLoading}
            />
          )}

          {isOrganizer && booking.status === 'paid' && (
            <>
              <Button
                title="Confirmer la prestation terminée"
                onPress={handleCompletePrestation}
                loading={actionLoading}
                style={styles.completeButton}
                icon={<Ionicons name="checkmark-circle" size={20} color="#fff" />}
              />
              <Text style={styles.completionNote}>
                En confirmant, vous libérez le paiement au DJ. Cette action est irréversible.
              </Text>
              <Button
                title="Laisser un avis"
                variant="secondary"
                onPress={() => setShowReviewModal(true)}
                icon={<Ionicons name="star" size={20} color="#fff" />}
              />
            </>
          )}

          {isOrganizer && booking.status === 'completed' && (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-circle" size={24} color="#00B894" />
              <Text style={styles.completedText}>Prestation confirmée - Paiement libéré au DJ</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Payment Modal */}
      {showPaymentModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Paiement</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalAmount}>{booking.total_amount}€</Text>

            <Text style={styles.modalSubtitle}>Méthode de paiement</Text>
            
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'simulated' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('simulated')}
            >
              <Ionicons name="card" size={24} color="#6C5CE7" />
              <Text style={styles.paymentOptionText}>Paiement simulé (MVP)</Text>
              {paymentMethod === 'simulated' && (
                <Ionicons name="checkmark-circle" size={20} color="#00B894" />
              )}
            </TouchableOpacity>

            <View style={styles.simulatedNote}>
              <Ionicons name="information-circle" size={20} color="#F39C12" />
              <Text style={styles.simulatedNoteText}>
                Le paiement est simulé pour cette version MVP. 
                Stripe et PayPal seront disponibles prochainement.
              </Text>
            </View>

            <Button
              title="Confirmer le paiement"
              onPress={handlePayment}
              loading={actionLoading}
            />
          </View>
        </View>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Laisser un avis</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Note</Text>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                  <Ionicons
                    name={star <= reviewRating ? 'star' : 'star-outline'}
                    size={40}
                    color="#F1C40F"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalSubtitle}>Commentaire</Text>
            <TextInput
              style={styles.reviewInput}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Partagez votre expérience..."
              placeholderTextColor="#636E72"
              multiline
              numberOfLines={4}
            />

            <Button
              title="Publier l'avis"
              onPress={handleReview}
              loading={actionLoading}
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
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
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00B894',
  },
  eventCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 12,
    color: '#636E72',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#B2BEC3',
  },
  djCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  djName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  djRealName: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  organizerCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  organizerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  messageSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  messageText: {
    fontSize: 16,
    color: '#B2BEC3',
    lineHeight: 24,
  },
  datesSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: '#636E72',
  },
  dateValue: {
    fontSize: 14,
    color: '#fff',
  },
  actionsSection: {
    gap: 12,
  },
  acceptButton: {
    backgroundColor: '#00B894',
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
  modalAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#00B894',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3436',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  paymentOptionSelected: {
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  paymentOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  simulatedNote: {
    flexDirection: 'row',
    backgroundColor: '#2D3436',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  simulatedNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#B2BEC3',
    lineHeight: 20,
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  reviewInput: {
    backgroundColor: '#2D3436',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
});
