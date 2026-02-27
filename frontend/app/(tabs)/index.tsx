import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { djApi, bookingApi, eventApi } from '../../src/services/api';
import { DJCard } from '../../src/components/DJCard';
import { BookingCard } from '../../src/components/BookingCard';
import { Button } from '../../src/components/Button';
import { DJProfile, Booking, Event } from '../../src/types';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const isDJ = user?.user_type === 'dj';
  const [refreshing, setRefreshing] = useState(false);
  const [featuredDJs, setFeaturedDJs] = useState<DJProfile[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      if (isDJ) {
        const bookingsRes = await bookingApi.getMy();
        setRecentBookings(bookingsRes.data.slice(0, 3));
      } else {
        const djsRes = await djApi.searchProfiles({ limit: 5 });
        setFeaturedDJs(djsRes.data);
        const eventsRes = await eventApi.getMy();
        setMyEvents(eventsRes.data.slice(0, 3));
        const bookingsRes = await bookingApi.getMy();
        setRecentBookings(bookingsRes.data.slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Bonjour, {user?.first_name} 👋
            </Text>
            <Text style={styles.subGreeting}>
              {isDJ ? 'Gérez vos prestations' : 'Trouvez le DJ parfait'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/(tabs)/messages')}
          >
            <Ionicons name="notifications" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {isDJ ? (
            <>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(tabs)/profile')}
              >
                <Ionicons name="person-circle" size={32} color="#6C5CE7" />
                <Text style={styles.actionText}>Mon Profil DJ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(tabs)/bookings')}
              >
                <Ionicons name="calendar" size={32} color="#00B894" />
                <Text style={styles.actionText}>Mes Réservations</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(tabs)/search')}
              >
                <Ionicons name="search" size={32} color="#6C5CE7" />
                <Text style={styles.actionText}>Chercher un DJ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/event/create')}
              >
                <Ionicons name="add-circle" size={32} color="#00B894" />
                <Text style={styles.actionText}>Créer un événement</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Recent Bookings */}
        {recentBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Réservations récentes</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            {recentBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                userType={user?.user_type || 'organizer'}
                onPress={() => router.push(`/booking/${booking.id}`)}
              />
            ))}
          </View>
        )}

        {/* Featured DJs (for organizers) */}
        {!isDJ && featuredDJs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>DJs en vedette</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            {featuredDJs.slice(0, 2).map((dj) => (
              <DJCard
                key={dj.id}
                dj={dj}
                onPress={() => router.push(`/dj/${dj.id}`)}
              />
            ))}
          </View>
        )}

        {/* My Events (for organizers) */}
        {!isDJ && myEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mes événements</Text>
            </View>
            {myEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push(`/event/${event.id}`)}
              >
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.eventMeta}>
                    <Ionicons name="calendar" size={14} color="#636E72" />
                    <Text style={styles.eventMetaText}>{event.date}</Text>
                    <Ionicons name="location" size={14} color="#636E72" />
                    <Text style={styles.eventMetaText}>{event.city}</Text>
                  </View>
                </View>
                <View style={[
                  styles.eventStatus,
                  { backgroundColor: event.status === 'open' ? '#00B894' : '#636E72' }
                ]}>
                  <Text style={styles.eventStatusText}>
                    {event.status === 'open' ? 'Ouvert' : 'Fermé'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!loading && recentBookings.length === 0 && featuredDJs.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes" size={60} color="#636E72" />
            <Text style={styles.emptyTitle}>
              {isDJ ? 'Aucune réservation' : 'Commencez à explorer'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isDJ
                ? 'Complétez votre profil pour recevoir des demandes'
                : 'Recherchez des DJs ou créez votre premier événement'}
            </Text>
            <Button
              title={isDJ ? 'Compléter mon profil' : 'Rechercher des DJs'}
              onPress={() => router.push(isDJ ? '/(tabs)/profile' : '/(tabs)/search')}
              style={styles.emptyButton}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  subGreeting: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  seeAll: {
    fontSize: 14,
    color: '#6C5CE7',
    fontWeight: '500',
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventMetaText: {
    fontSize: 12,
    color: '#636E72',
  },
  eventStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  eventStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    width: '100%',
  },
});
