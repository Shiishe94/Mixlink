import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { djApi, bookingApi, eventApi, reviewApi, messageApi } from '../../src/services/api';
import { DJProfile, Event, Review } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/Button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DJDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [dj, setDJ] = useState<DJProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const isOrganizer = user?.user_type === 'organizer';

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [djRes, reviewsRes] = await Promise.all([
        djApi.getProfile(id!),
        reviewApi.getByDJ(id!),
      ]);
      setDJ(djRes.data);
      setReviews(reviewsRes.data);

      if (isOrganizer) {
        const eventsRes = await eventApi.getMy();
        setMyEvents(eventsRes.data.filter((e: Event) => e.status === 'open'));
      }
    } catch (error) {
      console.error('Error loading DJ:', error);
      Alert.alert('Erreur', 'Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedEvent) {
      Alert.alert('Erreur', 'Veuillez sélectionner un événement');
      return;
    }

    setBookingLoading(true);
    try {
      await bookingApi.create({
        dj_id: id,
        event_id: selectedEvent.id,
        proposed_rate: dj!.hourly_rate * 4, // Assuming 4 hours minimum
        message: `Demande de réservation pour ${selectedEvent.title}`,
      });
      Alert.alert('Succès', 'Demande de réservation envoyée !', [
        { text: 'OK', onPress: () => router.push('/(tabs)/bookings') },
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible d\'envoyer la demande');
    } finally {
      setBookingLoading(false);
      setShowBookingModal(false);
    }
  };

  const handleMessage = async () => {
    if (!dj) return;
    router.push(`/messages/${dj.user_id}`);
  };

  const openSocialMedia = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le lien');
    });
  };

  const renderStars = (rating: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Ionicons
          key={i}
          name={i < Math.floor(rating) ? 'star' : i < rating ? 'star-half' : 'star-outline'}
          size={20}
          color="#F1C40F"
        />
      ));
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

  if (!dj) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>DJ non trouvé</Text>
          <Button title="Retour" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Image */}
        <View style={styles.profileImageContainer}>
          {dj.user?.profile_image ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${dj.user.profile_image}` }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={80} color="#636E72" />
            </View>
          )}
        </View>

        {/* DJ Info */}
        <View style={styles.djInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.artistName}>{dj.artist_name}</Text>
            {dj.is_verified && (
              <Ionicons name="checkmark-circle" size={24} color="#00B894" />
            )}
          </View>
          <Text style={styles.location}>
            <Ionicons name="location" size={16} color="#636E72" /> {dj.city}
          </Text>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>{renderStars(dj.rating)}</View>
            <Text style={styles.ratingText}>
              {dj.rating.toFixed(1)} ({dj.review_count} avis)
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{dj.hourly_rate}€</Text>
              <Text style={styles.statLabel}>/ heure</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{dj.experience_years}</Text>
              <Text style={styles.statLabel}>ans exp.</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{dj.booking_count}</Text>
              <Text style={styles.statLabel}>prestations</Text>
            </View>
          </View>

          {/* Bio */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.bio}>{dj.bio}</Text>
          </View>

          {/* Music Styles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Styles musicaux</Text>
            <View style={styles.tagsContainer}>
              {dj.music_styles.map((style, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{style}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Event Types */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Types d'événements</Text>
            <View style={styles.tagsContainer}>
              {dj.event_types.map((type, index) => (
                <View key={index} style={[styles.tag, styles.eventTag]}>
                  <Text style={styles.tagText}>{type}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Equipment */}
          {dj.equipment && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Équipement</Text>
              <Text style={styles.equipment}>{dj.equipment}</Text>
            </View>
          )}

          {/* Social Media */}
          {dj.social_media && Object.values(dj.social_media).some((v) => v) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Réseaux sociaux</Text>
              <View style={styles.socialMediaContainer}>
                {dj.social_media.instagram && (
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => openSocialMedia(`https://instagram.com/${dj.social_media!.instagram}`)}
                  >
                    <Ionicons name="logo-instagram" size={24} color="#E4405F" />
                  </TouchableOpacity>
                )}
                {dj.social_media.soundcloud && (
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => openSocialMedia(dj.social_media!.soundcloud!)}
                  >
                    <Ionicons name="logo-soundcloud" size={24} color="#FF5500" />
                  </TouchableOpacity>
                )}
                {dj.social_media.youtube && (
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => openSocialMedia(dj.social_media!.youtube!)}
                  >
                    <Ionicons name="logo-youtube" size={24} color="#FF0000" />
                  </TouchableOpacity>
                )}
                {dj.social_media.facebook && (
                  <TouchableOpacity
                    style={styles.socialButton}
                    onPress={() => openSocialMedia(dj.social_media!.facebook!)}
                  >
                    <Ionicons name="logo-facebook" size={24} color="#1877F2" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Reviews */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avis ({reviews.length})</Text>
            {reviews.length === 0 ? (
              <Text style={styles.noReviews}>Aucun avis pour le moment</Text>
            ) : (
              reviews.slice(0, 3).map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>
                      {review.organizer?.first_name} {review.organizer?.last_name}
                    </Text>
                    <View style={styles.reviewRating}>
                      {Array(review.rating).fill(0).map((_, i) => (
                        <Ionicons key={i} name="star" size={14} color="#F1C40F" />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                  <Text style={styles.reviewDate}>
                    {format(new Date(review.created_at), 'd MMMM yyyy', { locale: fr })}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Booking Modal */}
      {showBookingModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Réserver {dj.artist_name}</Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {myEvents.length === 0 ? (
              <View style={styles.noEventsContainer}>
                <Text style={styles.noEventsText}>Vous n'avez pas d'événement ouvert</Text>
                <Button
                  title="Créer un événement"
                  onPress={() => {
                    setShowBookingModal(false);
                    router.push('/event/create');
                  }}
                />
              </View>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>Sélectionnez un événement</Text>
                <ScrollView style={styles.eventsList}>
                  {myEvents.map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={[
                        styles.eventOption,
                        selectedEvent?.id === event.id && styles.eventOptionSelected,
                      ]}
                      onPress={() => setSelectedEvent(event)}
                    >
                      <Text style={styles.eventOptionTitle}>{event.title}</Text>
                      <Text style={styles.eventOptionDate}>{event.date}</Text>
                      {selectedEvent?.id === event.id && (
                        <Ionicons name="checkmark-circle" size={20} color="#00B894" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Button
                  title="Envoyer la demande"
                  onPress={handleBooking}
                  loading={bookingLoading}
                  disabled={!selectedEvent}
                />
              </>
            )}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {isOrganizer && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
            <Ionicons name="chatbubble" size={24} color="#6C5CE7" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => setShowBookingModal(true)}
          >
            <Text style={styles.bookButtonText}>Réserver</Text>
          </TouchableOpacity>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageContainer: {
    height: 300,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  djInfo: {
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  artistName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  location: {
    fontSize: 16,
    color: '#636E72',
    marginTop: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  stars: {
    flexDirection: 'row',
  },
  ratingText: {
    fontSize: 16,
    color: '#B2BEC3',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00B894',
  },
  statLabel: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#2D3436',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    color: '#B2BEC3',
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  eventTag: {
    backgroundColor: '#2D3436',
  },
  tagText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  equipment: {
    fontSize: 16,
    color: '#B2BEC3',
    lineHeight: 24,
  },
  socialMediaContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noReviews: {
    fontSize: 14,
    color: '#636E72',
    fontStyle: 'italic',
  },
  reviewCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: 14,
    color: '#B2BEC3',
    lineHeight: 20,
  },
  reviewDate: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 8,
  },
  bottomPadding: {
    height: 100,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 30,
    backgroundColor: '#0c0c0c',
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    gap: 12,
  },
  messageButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6C5CE7',
  },
  bookButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#6C5CE7',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
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
    maxHeight: '70%',
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
  modalSubtitle: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 16,
  },
  eventsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  eventOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3436',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  eventOptionSelected: {
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  eventOptionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  eventOptionDate: {
    fontSize: 14,
    color: '#636E72',
    marginRight: 8,
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noEventsText: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 16,
  },
});
