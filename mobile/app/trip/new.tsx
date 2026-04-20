import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, FlatList } from 'react-native';
import { Text, Button, TextInput, HelperText, ProgressBar, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCreateTrip } from '@/hooks/useTrips';
import { weatherApi } from '@/services/api';
import { Colors, Spacing, Typography } from '@/constants/theme';
import type { AccommodationType, TravelMethod, TripCreate } from '@/types';

const STEPS = ['Destination', 'Dates', 'How', 'Stay', 'Details'];

const TRAVEL_METHODS: { value: TravelMethod; label: string; emoji: string }[] = [
  { value: 'flight', label: 'Flight', emoji: '✈️' },
  { value: 'road_trip', label: 'Road Trip', emoji: '🚗' },
  { value: 'train', label: 'Train', emoji: '🚂' },
  { value: 'cruise', label: 'Cruise', emoji: '🚢' },
  { value: 'backpacking', label: 'Backpacking', emoji: '🎒' },
];

const ACCOMMODATION_TYPES: { value: AccommodationType; label: string; emoji: string }[] = [
  { value: 'hotel', label: 'Hotel', emoji: '🏨' },
  { value: 'airbnb', label: 'Airbnb/VRBO', emoji: '🏡' },
  { value: 'hostel', label: 'Hostel', emoji: '🏠' },
  { value: 'camping', label: 'Camping', emoji: '⛺' },
  { value: 'resort', label: 'Resort', emoji: '🏖️' },
  { value: 'cruise', label: 'Cruise Ship', emoji: '🚢' },
  { value: 'friends_family', label: "Friend's/Family", emoji: '🏘️' },
];

const TRAVELER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function NewTripScreen() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Partial<TripCreate>>({
    travelers: 1,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Date picker state
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Autocomplete state
  const [destQuery, setDestQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ place_id: string; description: string }[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Traveler dropdown
  const [showTravelerMenu, setShowTravelerMenu] = useState(false);

  const { mutateAsync: createTrip, isPending } = useCreateTrip();

  const progress = (step + 1) / STEPS.length;

  const handleDestinationSearch = useCallback((query: string) => {
    setDestQuery(query);
    setForm((f) => ({ ...f, destination: query }));

    if (searchTimeout) clearTimeout(searchTimeout);
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const results = await weatherApi.autocomplete(query);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    setSearchTimeout(timeout);
  }, [searchTimeout]);

  const handleSelectPlace = async (place: { place_id: string; description: string }) => {
    setDestQuery(place.description);
    setForm((f) => ({ ...f, destination: place.description }));
    setSuggestions([]);

    try {
      const details = await weatherApi.placeDetails(place.place_id);
      if (details.lat && details.lon) {
        setForm((f) => ({
          ...f,
          latitude: details.lat,
          longitude: details.lon,
          country_code: details.country_code ?? undefined,
        }));
      }
    } catch {}
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 0 && !form.destination) newErrors.destination = 'Please enter a destination';
    if (step === 1) {
      if (!form.start_date) newErrors.start_date = 'Please select a start date';
      if (!form.end_date) newErrors.end_date = 'Please select an end date';
      if (form.start_date && form.end_date && form.start_date >= form.end_date) {
        newErrors.end_date = 'End date must be after start date';
      }
    }
    if (step === 2 && !form.travel_method) newErrors.travel_method = 'Please select a travel method';
    if (step === 3 && !form.accommodation) newErrors.accommodation = 'Please select accommodation';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      const trip = await createTrip(form as TripCreate);
      router.replace(`/trip/${trip.id}`);
    } catch (err: any) {
      if (err.isPaymentRequired) {
        router.push('/premium');
      }
    }
  };

  const onStartDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (selectedDate) {
      setForm((f) => ({ ...f, start_date: formatDate(selectedDate) }));
    }
  };

  const onEndDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (selectedDate) {
      setForm((f) => ({ ...f, end_date: formatDate(selectedDate) }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {step > 0 && (
          <TouchableOpacity onPress={() => setStep((s) => s - 1)} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.stepLabel}>{STEPS[step]}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ProgressBar progress={progress} color={Colors.primary} style={styles.progress} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View>
            <Text style={styles.question}>Where are you going? 🌍</Text>
            <TextInput
              label="Destination"
              value={destQuery}
              onChangeText={handleDestinationSearch}
              placeholder="e.g. Tokyo, Japan"
              style={styles.input}
              error={!!errors.destination}
              autoFocus
            />
            <HelperText type="error" visible={!!errors.destination}>{errors.destination}</HelperText>
            {suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {suggestions.map((s) => (
                  <TouchableOpacity
                    key={s.place_id}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectPlace(s)}
                  >
                    <Text style={styles.suggestionText}>{s.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={styles.question}>When are you traveling? 📅</Text>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateLabel}>Start date</Text>
              <Text style={styles.dateValue}>
                {form.start_date ?? 'Tap to select'}
              </Text>
            </TouchableOpacity>
            <HelperText type="error" visible={!!errors.start_date}>{errors.start_date}</HelperText>

            {showStartPicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={form.start_date ? parseDate(form.start_date) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  minimumDate={new Date()}
                  onChange={onStartDateChange}
                />
                {Platform.OS === 'ios' && (
                  <Button onPress={() => setShowStartPicker(false)} style={styles.pickerDone}>
                    Done
                  </Button>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateLabel}>End date</Text>
              <Text style={styles.dateValue}>
                {form.end_date ?? 'Tap to select'}
              </Text>
            </TouchableOpacity>
            <HelperText type="error" visible={!!errors.end_date}>{errors.end_date}</HelperText>

            {showEndPicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={form.end_date ? parseDate(form.end_date) : (form.start_date ? parseDate(form.start_date) : new Date())}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  minimumDate={form.start_date ? parseDate(form.start_date) : new Date()}
                  onChange={onEndDateChange}
                />
                {Platform.OS === 'ios' && (
                  <Button onPress={() => setShowEndPicker(false)} style={styles.pickerDone}>
                    Done
                  </Button>
                )}
              </View>
            )}

            {form.start_date && form.end_date && (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>
                  {Math.ceil((parseDate(form.end_date).getTime() - parseDate(form.start_date).getTime()) / (1000 * 60 * 60 * 24))} nights
                </Text>
              </View>
            )}
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.question}>How are you getting there? 🚀</Text>
            {TRAVEL_METHODS.map((method) => (
              <TouchableOpacity
                key={method.value}
                style={[
                  styles.optionCard,
                  form.travel_method === method.value && styles.optionCardSelected,
                ]}
                onPress={() => setForm((f) => ({ ...f, travel_method: method.value }))}
              >
                <Text style={styles.optionEmoji}>{method.emoji}</Text>
                <Text style={styles.optionLabel}>{method.label}</Text>
              </TouchableOpacity>
            ))}
            <HelperText type="error" visible={!!errors.travel_method}>{errors.travel_method}</HelperText>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.question}>Where are you staying? 🏨</Text>
            <View style={styles.grid}>
              {ACCOMMODATION_TYPES.map((acc) => (
                <TouchableOpacity
                  key={acc.value}
                  style={[
                    styles.gridCard,
                    form.accommodation === acc.value && styles.optionCardSelected,
                  ]}
                  onPress={() => setForm((f) => ({ ...f, accommodation: acc.value }))}
                >
                  <Text style={styles.optionEmoji}>{acc.emoji}</Text>
                  <Text style={styles.gridLabel}>{acc.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <HelperText type="error" visible={!!errors.accommodation}>{errors.accommodation}</HelperText>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={styles.question}>Almost done! A few final details 🎉</Text>

            <Text style={styles.fieldLabel}>Number of travelers</Text>
            <Menu
              visible={showTravelerMenu}
              onDismiss={() => setShowTravelerMenu(false)}
              anchor={
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowTravelerMenu(true)}
                >
                  <Text style={styles.dropdownValue}>{form.travelers ?? 1} traveler{(form.travelers ?? 1) > 1 ? 's' : ''}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              }
            >
              {TRAVELER_OPTIONS.map((n) => (
                <Menu.Item
                  key={n}
                  title={`${n} traveler${n > 1 ? 's' : ''}`}
                  onPress={() => {
                    setForm((f) => ({ ...f, travelers: n }));
                    setShowTravelerMenu(false);
                  }}
                />
              ))}
            </Menu>

            <TextInput
              label="Notes (optional)"
              value={form.notes ?? ''}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              placeholder="Any special considerations..."
              multiline
              numberOfLines={3}
              style={[styles.input, { marginTop: Spacing.md }]}
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleNext}
          loading={isPending}
          disabled={isPending}
          style={styles.nextButton}
          contentStyle={styles.nextButtonContent}
        >
          {step === STEPS.length - 1 ? '✨ Generate Packing List' : 'Next'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
  },
  backButton: {},
  backText: { ...Typography.body, color: Colors.primary },
  stepLabel: { ...Typography.h3, color: Colors.onSurface },
  cancelText: { ...Typography.body, color: Colors.muted },
  progress: { height: 3, backgroundColor: Colors.border },
  content: { padding: Spacing.lg, paddingBottom: 120 },
  question: { ...Typography.h2, color: Colors.onSurface, marginBottom: Spacing.lg },
  input: { marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  suggestionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 200,
    marginTop: -4,
  },
  suggestionItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionText: { ...Typography.body, color: Colors.onSurface },
  dateButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dateLabel: { ...Typography.caption, color: Colors.muted, marginBottom: 4 },
  dateValue: { ...Typography.body, color: Colors.onSurface },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  pickerDone: { alignSelf: 'flex-end', marginRight: Spacing.sm, marginBottom: Spacing.sm },
  durationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f0fe',
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
  },
  durationText: { ...Typography.label, color: Colors.primary },
  fieldLabel: { ...Typography.label, color: Colors.muted, marginBottom: Spacing.xs },
  dropdownButton: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownValue: { ...Typography.body, color: Colors.onSurface },
  dropdownArrow: { color: Colors.muted, fontSize: 12 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#e8f0fe',
  },
  optionEmoji: { fontSize: 24, marginRight: Spacing.md },
  optionLabel: { ...Typography.body, color: Colors.onSurface, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridCard: {
    width: '47%',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  gridLabel: { ...Typography.caption, color: Colors.onSurface, marginTop: 4, textAlign: 'center' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  nextButton: { borderRadius: 12 },
  nextButtonContent: { paddingVertical: Spacing.sm },
});
