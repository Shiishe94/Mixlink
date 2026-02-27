import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Booking } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  userType: 'dj' | 'organizer';
}

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

export const BookingCard: React.FC<BookingCardProps> = ({ booking, onPress, userType }) => {
  const statusColor = STATUS_COLORS[booking.status] || '#636E72';
  const statusLabel = STATUS_LABELS[booking.status] || booking.status;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
        <Text style={styles.amount}>{booking.total_amount}€</Text>
      </View>

      <Text style={styles.eventTitle} numberOfLines={1}>
        {booking.event?.title || 'Événement'}
      </Text>

      {userType === 'organizer' && booking.dj && (
        <View style={styles.infoRow}>
          <Ionicons name="musical-notes" size={16} color="#6C5CE7" />
          <Text style={styles.infoText}>{booking.dj.artist_name}</Text>
        </View>
      )}

      {userType === 'dj' && booking.organizer && (
        <View style={styles.infoRow}>
          <Ionicons name="person" size={16} color="#6C5CE7" />
          <Text style={styles.infoText}>
            {booking.organizer.first_name} {booking.organizer.last_name}
          </Text>
        </View>
      )}

      {booking.event && (
        <>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color="#636E72" />
            <Text style={styles.infoText}>
              {format(new Date(booking.event.date), 'EEEE d MMMM yyyy', { locale: fr })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color="#636E72" />
            <Text style={styles.infoText}>{booking.event.city}</Text>
          </View>
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.date}>
          Créée le {format(new Date(booking.created_at), 'd MMM yyyy', { locale: fr })}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#636E72" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00B894',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#B2BEC3',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2D3436',
  },
  date: {
    fontSize: 12,
    color: '#636E72',
  },
});
