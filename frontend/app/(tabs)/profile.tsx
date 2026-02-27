import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import { djApi, configApi } from '../../src/services/api';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { DJProfile, SocialMedia } from '../../src/types';

export default function ProfileScreen() {
  const { user, logout, updateProfile, refreshUser } = useAuthStore();
  const isDJ = user?.user_type === 'dj';
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [djProfile, setDJProfile] = useState<DJProfile | null>(null);
  const [musicStyles, setMusicStyles] = useState<string[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [showDJForm, setShowDJForm] = useState(false);

  // User form
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // DJ Profile form
  const [artistName, setArtistName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [equipment, setEquipment] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [socialMedia, setSocialMedia] = useState<SocialMedia>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [stylesRes, typesRes] = await Promise.all([
        configApi.getMusicStyles(),
        configApi.getEventTypes(),
      ]);
      setMusicStyles(stylesRes.data);
      setEventTypes(typesRes.data);

      if (isDJ) {
        try {
          const profileRes = await djApi.getMyProfile();
          const profile = profileRes.data;
          setDJProfile(profile);
          setArtistName(profile.artist_name);
          setBio(profile.bio);
          setCity(profile.city);
          setHourlyRate(profile.hourly_rate.toString());
          setExperienceYears(profile.experience_years.toString());
          setEquipment(profile.equipment || '');
          setSelectedStyles(profile.music_styles);
          setSelectedEventTypes(profile.event_types);
          setSocialMedia(profile.social_media || {});
        } catch (error: any) {
          if (error.response?.status === 404) {
            setShowDJForm(true);
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      try {
        await updateProfile({ profile_image: result.assets[0].base64 });
        await refreshUser();
        Alert.alert('Succès', 'Photo mise à jour');
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de mettre à jour la photo');
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ first_name: firstName, last_name: lastName, phone });
      await refreshUser();
      setEditMode(false);
      Alert.alert('Succès', 'Profil mis à jour');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    }
  };

  const handleSaveDJProfile = async () => {
    if (!artistName || !bio || !city || !hourlyRate || selectedStyles.length === 0) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        artist_name: artistName,
        bio,
        city,
        hourly_rate: parseFloat(hourlyRate),
        experience_years: parseInt(experienceYears) || 0,
        equipment,
        music_styles: selectedStyles,
        event_types: selectedEventTypes,
        social_media: socialMedia,
        minimum_hours: 2,
        travel_radius_km: 50,
      };

      if (djProfile) {
        await djApi.updateProfile(profileData);
      } else {
        await djApi.createProfile(profileData);
      }

      await loadData();
      setShowDJForm(false);
      Alert.alert('Succès', 'Profil DJ mis à jour');
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de sauvegarder');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: logout },
    ]);
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const toggleEventType = (type: string) => {
    setSelectedEventTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  if (loading && !user) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Profil</Text>
            <TouchableOpacity onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#E74C3C" />
            </TouchableOpacity>
          </View>

          {/* Profile Image */}
          <View style={styles.profileSection}>
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
              {user?.profile_image ? (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${user.profile_image}` }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#636E72" />
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text style={styles.userType}>
              {isDJ ? 'DJ' : 'Organisateur'}
            </Text>
          </View>

          {/* User Info */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Informations personnelles</Text>
              <TouchableOpacity onPress={() => setEditMode(!editMode)}>
                <Text style={styles.editButton}>{editMode ? 'Annuler' : 'Modifier'}</Text>
              </TouchableOpacity>
            </View>

            {editMode ? (
              <>
                <Input
                  label="Prénom"
                  value={firstName}
                  onChangeText={setFirstName}
                  leftIcon="person"
                />
                <Input
                  label="Nom"
                  value={lastName}
                  onChangeText={setLastName}
                  leftIcon="person-outline"
                />
                <Input
                  label="Téléphone"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  leftIcon="call"
                />
                <Button title="Enregistrer" onPress={handleSaveProfile} />
              </>
            ) : (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="mail" size={20} color="#6C5CE7" />
                  <Text style={styles.infoText}>{user?.email}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="call" size={20} color="#6C5CE7" />
                  <Text style={styles.infoText}>{user?.phone || 'Non renseigné'}</Text>
                </View>
              </View>
            )}
          </View>

          {/* DJ Profile */}
          {isDJ && (djProfile || showDJForm) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Profil DJ</Text>
                {djProfile && !showDJForm && (
                  <TouchableOpacity onPress={() => setShowDJForm(true)}>
                    <Text style={styles.editButton}>Modifier</Text>
                  </TouchableOpacity>
                )}
              </View>

              {showDJForm ? (
                <>
                  <Input
                    label="Nom d'artiste *"
                    value={artistName}
                    onChangeText={setArtistName}
                    placeholder="DJ Example"
                  />
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Bio *</Text>
                    <TextInput
                      style={styles.textArea}
                      value={bio}
                      onChangeText={setBio}
                      placeholder="Présentez-vous..."
                      placeholderTextColor="#636E72"
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                  <Input
                    label="Ville *"
                    value={city}
                    onChangeText={setCity}
                    placeholder="Paris"
                    leftIcon="location"
                  />
                  <View style={styles.row}>
                    <View style={styles.halfInput}>
                      <Input
                        label="Tarif horaire (€) *"
                        value={hourlyRate}
                        onChangeText={setHourlyRate}
                        keyboardType="numeric"
                        placeholder="100"
                      />
                    </View>
                    <View style={styles.halfInput}>
                      <Input
                        label="Expérience (ans)"
                        value={experienceYears}
                        onChangeText={setExperienceYears}
                        keyboardType="numeric"
                        placeholder="5"
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Équipement</Text>
                    <TextInput
                      style={styles.textArea}
                      value={equipment}
                      onChangeText={setEquipment}
                      placeholder="Pioneer CDJ-2000, DJM-900..."
                      placeholderTextColor="#636E72"
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  <Text style={styles.label}>Styles musicaux *</Text>
                  <View style={styles.chipsContainer}>
                    {musicStyles.map((style) => (
                      <TouchableOpacity
                        key={style}
                        style={[
                          styles.chip,
                          selectedStyles.includes(style) && styles.chipSelected,
                        ]}
                        onPress={() => toggleStyle(style)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selectedStyles.includes(style) && styles.chipTextSelected,
                          ]}
                        >
                          {style}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Types d'événements</Text>
                  <View style={styles.chipsContainer}>
                    {eventTypes.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.chip,
                          selectedEventTypes.includes(type) && styles.chipSelected,
                        ]}
                        onPress={() => toggleEventType(type)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selectedEventTypes.includes(type) && styles.chipTextSelected,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Réseaux sociaux</Text>
                  <Input
                    label="Instagram"
                    value={socialMedia.instagram || ''}
                    onChangeText={(v) => setSocialMedia({ ...socialMedia, instagram: v })}
                    placeholder="@votrepseudo"
                  />
                  <Input
                    label="SoundCloud"
                    value={socialMedia.soundcloud || ''}
                    onChangeText={(v) => setSocialMedia({ ...socialMedia, soundcloud: v })}
                    placeholder="URL de votre profil"
                  />
                  <Input
                    label="YouTube"
                    value={socialMedia.youtube || ''}
                    onChangeText={(v) => setSocialMedia({ ...socialMedia, youtube: v })}
                    placeholder="URL de votre chaîne"
                  />

                  <View style={styles.formButtons}>
                    {djProfile && (
                      <Button
                        title="Annuler"
                        variant="outline"
                        onPress={() => setShowDJForm(false)}
                        style={styles.cancelButton}
                      />
                    )}
                    <Button
                      title="Enregistrer"
                      onPress={handleSaveDJProfile}
                      loading={loading}
                      style={styles.saveButton}
                    />
                  </View>
                </>
              ) : (
                djProfile && (
                  <View style={styles.djInfoCard}>
                    <Text style={styles.djArtistName}>{djProfile.artist_name}</Text>
                    <Text style={styles.djBio}>{djProfile.bio}</Text>
                    <View style={styles.djStats}>
                      <View style={styles.djStat}>
                        <Text style={styles.djStatValue}>{djProfile.hourly_rate}€</Text>
                        <Text style={styles.djStatLabel}>/ heure</Text>
                      </View>
                      <View style={styles.djStat}>
                        <Text style={styles.djStatValue}>{djProfile.rating.toFixed(1)}</Text>
                        <Text style={styles.djStatLabel}>⭐ note</Text>
                      </View>
                      <View style={styles.djStat}>
                        <Text style={styles.djStatValue}>{djProfile.booking_count}</Text>
                        <Text style={styles.djStatLabel}>réservations</Text>
                      </View>
                    </View>
                    <View style={styles.djStyles}>
                      {djProfile.music_styles.map((style, index) => (
                        <View key={index} style={styles.djStyleTag}>
                          <Text style={styles.djStyleText}>{style}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )
              )}
            </View>
          )}

          {/* Create DJ Profile CTA */}
          {isDJ && !djProfile && !showDJForm && (
            <View style={styles.ctaSection}>
              <Ionicons name="disc" size={48} color="#6C5CE7" />
              <Text style={styles.ctaTitle}>Créez votre profil DJ</Text>
              <Text style={styles.ctaText}>
                Complétez votre profil pour être visible par les organisateurs
              </Text>
              <Button
                title="Créer mon profil DJ"
                onPress={() => setShowDJForm(true)}
                style={styles.ctaButton}
              />
            </View>
          )}

          {/* Admin Panel Link */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.adminLink}
              onPress={() => router.push('/admin')}
            >
              <View style={styles.adminLinkContent}>
                <Ionicons name="shield-checkmark" size={24} color="#6C5CE7" />
                <View style={styles.adminLinkText}>
                  <Text style={styles.adminLinkTitle}>Administration</Text>
                  <Text style={styles.adminLinkSubtitle}>Gérer les commissions et retraits</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#636E72" />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6C5CE7',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0c0c0c',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  userType: {
    fontSize: 14,
    color: '#6C5CE7',
    marginTop: 4,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  editButton: {
    fontSize: 14,
    color: '#6C5CE7',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3436',
  },
  infoText: {
    fontSize: 16,
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2D3436',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2D3436',
  },
  chipSelected: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  chipText: {
    fontSize: 14,
    color: '#B2BEC3',
  },
  chipTextSelected: {
    color: '#fff',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  djInfoCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
  },
  djArtistName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  djBio: {
    fontSize: 14,
    color: '#B2BEC3',
    lineHeight: 20,
    marginBottom: 16,
  },
  djStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2D3436',
    marginBottom: 16,
  },
  djStat: {
    alignItems: 'center',
  },
  djStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00B894',
  },
  djStatLabel: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 4,
  },
  djStyles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  djStyleTag: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  djStyleText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  ctaSection: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    marginBottom: 24,
  },
  ctaButton: {
    width: '100%',
  },
  bottomPadding: {
    height: 40,
  },
});
