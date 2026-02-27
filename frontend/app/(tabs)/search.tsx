import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { djApi, configApi, eventApi } from '../../src/services/api';
import { DJCard } from '../../src/components/DJCard';
import { DJProfile, Event } from '../../src/types';

export default function SearchScreen() {
  const { user } = useAuthStore();
  const isDJ = user?.user_type === 'dj';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [djs, setDJs] = useState<DJProfile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [musicStyles, setMusicStyles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const loadData = async () => {
    try {
      const stylesRes = await configApi.getMusicStyles();
      setMusicStyles(stylesRes.data);

      if (isDJ) {
        const eventsRes = await eventApi.getAll({ status: 'open' });
        setEvents(eventsRes.data);
      } else {
        const params: any = {};
        if (selectedStyle) params.music_style = selectedStyle;
        if (selectedCity) params.city = selectedCity;
        const djsRes = await djApi.searchProfiles(params);
        setDJs(djsRes.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStyle, selectedCity]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredDJs = djs.filter(
    (dj) =>
      dj.artist_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dj.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{isDJ ? 'Événements' : 'Trouver un DJ'}</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#636E72" />
          <TextInput
            style={styles.searchInput}
            placeholder={isDJ ? 'Rechercher un événement...' : 'Rechercher un DJ...'}
            placeholderTextColor="#636E72"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#636E72" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options" size={20} color={showFilters ? '#fff' : '#6C5CE7'} />
        </TouchableOpacity>
      </View>

      {showFilters && !isDJ && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterLabel}>Style musical</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stylesList}>
            <TouchableOpacity
              style={[styles.styleChip, !selectedStyle && styles.styleChipSelected]}
              onPress={() => setSelectedStyle(null)}
            >
              <Text style={[styles.styleChipText, !selectedStyle && styles.styleChipTextSelected]}>
                Tous
              </Text>
            </TouchableOpacity>
            {musicStyles.map((style) => (
              <TouchableOpacity
                key={style}
                style={[styles.styleChip, selectedStyle === style && styles.styleChipSelected]}
                onPress={() => setSelectedStyle(selectedStyle === style ? null : style)}
              >
                <Text
                  style={[
                    styles.styleChipText,
                    selectedStyle === style && styles.styleChipTextSelected,
                  ]}
                >
                  {style}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Ville</Text>
          <TextInput
            style={styles.cityInput}
            placeholder="Entrez une ville..."
            placeholderTextColor="#636E72"
            value={selectedCity}
            onChangeText={setSelectedCity}
          />
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />
        }
      >
        {isDJ ? (
          filteredEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={60} color="#636E72" />
              <Text style={styles.emptyText}>Aucun événement disponible</Text>
            </View>
          ) : (
            filteredEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push(`/event/${event.id}`)}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.eventTypeBadge}>
                    <Text style={styles.eventTypeText}>{event.event_type}</Text>
                  </View>
                  <Text style={styles.eventBudget}>
                    {event.budget_min}-{event.budget_max}€
                  </Text>
                </View>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <View style={styles.eventMeta}>
                  <View style={styles.eventMetaItem}>
                    <Ionicons name="calendar" size={16} color="#636E72" />
                    <Text style={styles.eventMetaText}>{event.date}</Text>
                  </View>
                  <View style={styles.eventMetaItem}>
                    <Ionicons name="time" size={16} color="#636E72" />
                    <Text style={styles.eventMetaText}>
                      {event.start_time} - {event.end_time}
                    </Text>
                  </View>
                </View>
                <View style={styles.eventMeta}>
                  <View style={styles.eventMetaItem}>
                    <Ionicons name="location" size={16} color="#636E72" />
                    <Text style={styles.eventMetaText}>{event.city}</Text>
                  </View>
                  <View style={styles.eventMetaItem}>
                    <Ionicons name="people" size={16} color="#636E72" />
                    <Text style={styles.eventMetaText}>{event.guest_count} invités</Text>
                  </View>
                </View>
                <View style={styles.eventStyles}>
                  {event.music_styles.slice(0, 3).map((style, index) => (
                    <View key={index} style={styles.eventStyleTag}>
                      <Text style={styles.eventStyleText}>{style}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))
          )
        ) : filteredDJs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="disc-outline" size={60} color="#636E72" />
            <Text style={styles.emptyText}>Aucun DJ trouvé</Text>
            <Text style={styles.emptySubtext}>Essayez de modifier vos filtres</Text>
          </View>
        ) : (
          filteredDJs.map((dj) => (
            <DJCard key={dj.id} dj={dj} onPress={() => router.push(`/dj/${dj.id}`)} />
          ))
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6C5CE7',
  },
  filterButtonActive: {
    backgroundColor: '#6C5CE7',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  stylesList: {
    marginBottom: 16,
  },
  styleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2D3436',
  },
  styleChipSelected: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  styleChipText: {
    fontSize: 14,
    color: '#B2BEC3',
  },
  styleChipTextSelected: {
    color: '#fff',
  },
  cityInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2D3436',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 8,
  },
  eventCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTypeBadge: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  eventBudget: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00B894',
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
    marginBottom: 8,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventMetaText: {
    fontSize: 14,
    color: '#B2BEC3',
  },
  eventStyles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  eventStyleTag: {
    backgroundColor: '#2D3436',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventStyleText: {
    fontSize: 12,
    color: '#B2BEC3',
  },
  bottomPadding: {
    height: 20,
  },
});
