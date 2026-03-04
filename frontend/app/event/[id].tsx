import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { eventApi, matchApi, bookingApi } from '../../src/services/api';
import { Event, DJProfile } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';
import { goBack } from '../../src/utils/navigation';
import { DJCard } from '../../src/components/DJCard';
import { Button } from '../../src/components/Button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [matchedDJs, setMatchedDJs] = useState<DJProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);

  const isOrganizer = user?.user_type === 'organizer';
  const isMyEvent = event?.organizer_id === user?.id;

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const eventRes = await eventApi.getOne(id!);
      setEvent(eventRes.data);
    } catch (error) {
      console.error('Error loading event:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'\'événement');
    } finally {
      setLoading(false);
    }
  };

  const handleFindDJs = async () => {
    setMatchLoading(true);
    try {
      const res = await matchApi.getDJsForEvent(id!);
      setMatchedDJs(res.data);
    } catch (error) {
      console.error('Error matching DJs:', error);
      Alert.alert('Erreur', 'Impossible de trouver des DJs');
    } finally {
      setMatchLoading(false);
    }
  };

  const handleDeleteEvent = () => {
    Alert.alert(
      'Supprimer l\'\'événement',
      'Êtes-vous sûr de vouloir supprimer cet événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await eventApi.delete(id!);
              goBack();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'\'événement');
            }
          },
        },
      ]
    );
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

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Événement non trouvé</Text>
          <Button title="Retour" onPress={goBack} />
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
        {isMyEvent && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteEvent}>
            <Ionicons name="trash-outline" size={24} color="#E74C3C" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Event Header */}
        <View style={styles.eventHeader}>
          <View style={styles.eventTypeBadge}>
            <Text style={styles.eventTypeText}>{event.event_type}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: event.status === 'open' ? '#00B894' : '#636E72' }
          ]}>
            <Text style={styles.statusText}>
              {event.status === 'open' ? 'Ouvert' : event.status === 'booked' ? 'Réservé' : 'Fermé'}
            </Text>
          </View>
        </View>

        <Text style={styles.eventTitle}>{event.title}</Text>

        {/* Event Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color="#6C5CE7" />
            <Text style={styles.infoText}>
              {format(new Date(event.date), 'EEEE d MMMM yyyy', { locale: fr })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color="#6C5CE7" />
            <Text style={styles.infoText}>
              {event.start_time} - {event.end_time}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#6C5CE7" />
            <Text style={styles.infoText}>
              {event.location ? `${event.location}, ` : ''}{event.city}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="people" size={20} color="#6C5CE7" />
            <Text style={styles.infoText}>{event.guest_count} invités</Text>
          </View>
        </View>

        {/* Budget */}
        <View style={styles.budgetSection}>
          <Text style={styles.budgetLabel}>Budget</Text>
          <Text style={styles.budgetValue}>
            {event.budget_min}€ - {event.budget_max}€
          </Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        {/* Music Styles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Styles musicaux souhaités</Text>
          <View style={styles.tagsContainer}>
            {event.music_styles.map((style, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{style}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Special Requirements */}
        {event.special_requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exigences particulières</Text>
            <Text style={styles.requirements}>{event.special_requirements}</Text>
          </View>
        )}

        {/* Find DJs Button (for organizer's own event) */}
        {isMyEvent && event.status === 'open' && (
          <View style={styles.section}>
            <Button
              title="Trouver des DJs correspondants"
              onPress={handleFindDJs}
              loading={matchLoading}
              icon={<Ionicons name="search" size={20} color="#fff" />}
            />
          </View>
        )}

        {/* Matched DJs */}
        {matchedDJs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DJs recommandés</Text>
            {matchedDJs.map((dj) => (
              <DJCard
                key={dj.id}
                dj={dj}
                onPress={() => router.push(`/dj/${dj.id}`)}
              />
            ))}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  deleteButton: {
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
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  eventTypeBadge: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  eventTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  infoSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#fff',
  },
  budgetSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00B894',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  description: {
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
  tagText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  requirements: {
    fontSize: 16,
    color: '#B2BEC3',
    lineHeight: 24,
  },
  bottomPadding: {
    height: 40,
  },
});
