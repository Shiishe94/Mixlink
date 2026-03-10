import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DJProfile } from '../types';
import { NEON_COLORS } from './NeonBackground';

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
          color={NEON_COLORS.warning}
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
          <LinearGradient
            colors={[NEON_COLORS.card, NEON_COLORS.backgroundLight]}
            style={styles.placeholderImage}
          >
            <Ionicons name="person" size={40} color={NEON_COLORS.textMuted} />
          </LinearGradient>
        )}
        {dj.is_verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={20} color={NEON_COLORS.success} />
          </View>
        )}
        {dj.is_featured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={13} color="#000" />
            <Text style={styles.featuredBadgeText}>VEDETTE</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(10, 10, 15, 0.9)']}
          style={styles.imageOverlay}
        />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.artistName} numberOfLines={1}>{dj.artist_name}</Text>
        <Text style={styles.city}>
          <Ionicons name="location" size={12} color={NEON_COLORS.cyan} /> {dj.city}
        </Text>
        
        <View style={styles.ratingRow}>
          <View style={styles.stars}>{renderStars(dj.rating)}</View>
          <Text style={styles.ratingText}>
            {dj.rating.toFixed(1)} ({dj.review_count})
          </Text>
        </View>
        
        <View style={styles.stylesContainer}>
          {dj.music_styles.slice(0, 2).map((style, index) => (
            <LinearGradient
              key={index}
              colors={index === 0 ? [NEON_COLORS.cyan, NEON_COLORS.magenta] : [NEON_COLORS.magenta, NEON_COLORS.pink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.styleTag}
            >
              <Text style={styles.styleText}>{style}</Text>
            </LinearGradient>
          ))}
          {dj.music_styles.length > 2 && (
            <Text style={styles.moreStyles}>+{dj.music_styles.length - 2}</Text>
          )}
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.rate}>{dj.price}€<Text style={styles.rateLabel}> prestation</Text></Text>
          <Text style={styles.experience}>{dj.experience_years} ans exp.</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: NEON_COLORS.card,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: NEON_COLORS.cardBorder,
    shadowColor: NEON_COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: NEON_COLORS.backgroundLight,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: NEON_COLORS.card,
    borderRadius: 12,
    padding: 4,
    shadowColor: NEON_COLORS.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredBadgeText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
  },
  artistName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: NEON_COLORS.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  city: {
    fontSize: 14,
    color: NEON_COLORS.textSecondary,
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
    color: NEON_COLORS.textSecondary,
  },
  stylesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  styleTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  styleText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  moreStyles: {
    fontSize: 12,
    color: NEON_COLORS.textMuted,
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rate: {
    fontSize: 22,
    fontWeight: '700',
    color: NEON_COLORS.success,
    textShadowColor: NEON_COLORS.success,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  rateLabel: {
    fontSize: 14,
    fontWeight: '400',
  },
  experience: {
    fontSize: 14,
    color: NEON_COLORS.textMuted,
  },
});
