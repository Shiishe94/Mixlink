import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { eventApi, configApi } from '../../src/services/api';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { useEffect } from 'react';

export default function CreateEventScreen() {
  const [loading, setLoading] = useState(false);
  const [musicStyles, setMusicStyles] = useState<string[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [guestCount, setGuestCount] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const [stylesRes, typesRes] = await Promise.all([
        configApi.getMusicStyles(),
        configApi.getEventTypes(),
      ]);
      setMusicStyles(stylesRes.data);
      setEventTypes(typesRes.data);
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const handleCreate = async () => {
    // Validation
    if (!title || !description || !eventType || !date || !startTime || !endTime || !city || !budgetMin || !budgetMax || selectedStyles.length === 0) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await eventApi.create({
        title,
        description,
        event_type: eventType,
        date,
        start_time: startTime,
        end_time: endTime,
        location,
        city,
        budget_min: parseFloat(budgetMin),
        budget_max: parseFloat(budgetMax),
        music_styles: selectedStyles,
        guest_count: parseInt(guestCount) || 0,
        special_requirements: specialRequirements,
      });

      Alert.alert('Succès', 'Événement créé !', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de créer l\'\'événement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nouvel événement</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Input
            label="Titre de l'événement *"
            value={title}
            onChangeText={setTitle}
            placeholder="Mariage de Jean et Marie"
          />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Décrivez votre événement..."
              placeholderTextColor="#636E72"
              multiline
              numberOfLines={4}
            />
          </View>

          <Text style={styles.label}>Type d'événement *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.typesList}
          >
            {eventTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  eventType === type && styles.typeChipSelected,
                ]}
                onPress={() => setEventType(type)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    eventType === type && styles.typeChipTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="Date *"
                value={date}
                onChangeText={setDate}
                placeholder="2025-08-15"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="Heure début *"
                value={startTime}
                onChangeText={setStartTime}
                placeholder="20:00"
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="Heure fin *"
                value={endTime}
                onChangeText={setEndTime}
                placeholder="04:00"
              />
            </View>
          </View>

          <Input
            label="Lieu"
            value={location}
            onChangeText={setLocation}
            placeholder="Château de Versailles"
            leftIcon="location"
          />

          <Input
            label="Ville *"
            value={city}
            onChangeText={setCity}
            placeholder="Paris"
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="Budget min (€) *"
                value={budgetMin}
                onChangeText={setBudgetMin}
                keyboardType="numeric"
                placeholder="500"
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="Budget max (€) *"
                value={budgetMax}
                onChangeText={setBudgetMax}
                keyboardType="numeric"
                placeholder="1500"
              />
            </View>
          </View>

          <Input
            label="Nombre d'invités"
            value={guestCount}
            onChangeText={setGuestCount}
            keyboardType="numeric"
            placeholder="150"
            leftIcon="people"
          />

          <Text style={styles.label}>Styles musicaux souhaités *</Text>
          <View style={styles.stylesContainer}>
            {musicStyles.map((style) => (
              <TouchableOpacity
                key={style}
                style={[
                  styles.styleChip,
                  selectedStyles.includes(style) && styles.styleChipSelected,
                ]}
                onPress={() => toggleStyle(style)}
              >
                <Text
                  style={[
                    styles.styleChipText,
                    selectedStyles.includes(style) && styles.styleChipTextSelected,
                  ]}
                >
                  {style}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Exigences particulières</Text>
            <TextInput
              style={styles.textArea}
              value={specialRequirements}
              onChangeText={setSpecialRequirements}
              placeholder="Matériel spécifique, contraintes horaires..."
              placeholderTextColor="#636E72"
              multiline
              numberOfLines={3}
            />
          </View>

          <Button
            title="Créer l'événement"
            onPress={handleCreate}
            loading={loading}
            style={styles.createButton}
          />

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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
  typesList: {
    marginBottom: 20,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2D3436',
  },
  typeChipSelected: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  typeChipText: {
    fontSize: 14,
    color: '#B2BEC3',
  },
  typeChipTextSelected: {
    color: '#fff',
  },
  stylesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  styleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
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
  createButton: {
    marginTop: 16,
  },
  bottomPadding: {
    height: 40,
  },
});
