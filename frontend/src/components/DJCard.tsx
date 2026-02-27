import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DJProfile } from '../types';

interface DJCardProps {
  dj: DJProfile;
  onPress: () => void;
}

export const DJCard: React.FC<DJCardProps> = ({ dj, onPress }) => {
  const renderStars = (rating: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Ionicons
          key={i}
          name={i < Math.floor(rating) ? 'star' : 'star-outline'}
          size={14}
          color="#F1C40F"
        />
      ));
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        {dj.user?.profile_image ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${dj.user.profile_image}` }}
            style={styles.image}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="person" size={40} color="#636E72" />
          </View>
        )}
        {dj.is_verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#00B894" />
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.artistName} numberOfLines={1}>{dj.artist_name}</Text>
        <Text style={styles.city}>
          <Ionicons name="location" size={12} color="#636E72" /> {dj.city}
        </Text>
        
        <View style={styles.ratingRow}>
          <View style={styles.stars}>{renderStars(dj.rating)}</View>
          <Text style={styles.ratingText}>
            {dj.rating.toFixed(1)} ({dj.review_count})
          </Text>
        </View>
        
        <View style={styles.stylesContainer}>
          {dj.music_styles.slice(0, 2).map((style, index) => (
            <View key={index} style={styles.styleTag}>
              <Text style={styles.styleText}>{style}</Text>
            </View>
          ))}
          {dj.music_styles.length > 2 && (
            <Text style={styles.moreStyles}>+{dj.music_styles.length - 2}</Text>
          )}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.rate}>{dj.hourly_rate}€/h</Text>
          <Text style={styles.experience}>{dj.experience_years} ans exp.</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2D3436',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2D3436',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 4,
  },
  content: {
    padding: 16,
  },
  artistName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  city: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#B2BEC3',
  },
  stylesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  styleTag: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  styleText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  moreStyles: {
    fontSize: 12,
    color: '#636E72',
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00B894',
  },
  experience: {
    fontSize: 14,
    color: '#636E72',
  },
});
