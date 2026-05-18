import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, HelperText, ProgressBar, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCreateTrip } from '@/hooks/useTrips';
import { packingApi, weatherApi } from '@/services/api';
import { DateRangeCalendar } from '@/components/DateRangeCalendar';
import { Colors, Spacing, Typography } from '@/constants/theme';
import type { AccommodationType, ActivityInterest, TravelMethod, TripCreate } from '@/types';

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

const ACTIVITY_INTERESTS: { value: ActivityInterest; label: string }[] = [
  { value: 'beaches', label: 'Beaches' },
  { value: 'museums', label: 'Museums' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'dining', label: 'Dining' },
  { value: 'outdoors', label: 'Outdoors' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'shopping', label: 'Shopping' },
];

export default function NewTripScreen() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Partial<TripCreate>>({
    travelers: 1,
    male_travelers: 1,
    female_travelers: 0,
    activity_interests: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autocomplete state
  const [destQuery, setDestQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ place_id: string; description: string }[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

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
    if (step === 4 && ((form.male_travelers ?? 0) + (form.female_travelers ?? 0)) < 1) {
      newErrors.travelers = 'Please add at least one traveler';
    }
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
    setIsSubmitting(true);
    try {
      const maleTravelers = Math.max(0, form.male_travelers ?? 0);
      const femaleTravelers = Math.max(0, form.female_travelers ?? 0);
      const trip = await createTrip({
        ...form,
        travelers: Math.max(1, maleTravelers + femaleTravelers),
        male_travelers: maleTravelers,
        female_travelers: femaleTravelers,
        activity_interests: form.activity_interests ?? [],
      } as TripCreate);
      try {
        await packingApi.generate(trip.id);
      } catch (packingError) {
        console.warn('Trip created, but packing generation failed', packingError);
      }
      router.replace(`/trip/${trip.id}`);
    } catch (err: any) {
      if (err.isPaymentRequired) {
        router.push('/premium');
      } else if (err.isUnauthorized) {
        setSubmitError('Session expired — please sign in again.');
      } else {
        setSubmitError(err.message || 'Failed to create trip. Check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateTravelerCount = (field: 'male_travelers' | 'female_travelers', delta: number) => {
    setForm((current) => {
      const nextValue = Math.max(0, (current[field] ?? 0) + delta);
      const next = { ...current, [field]: nextValue };
      const total = Math.max(1, (next.male_travelers ?? 0) + (next.female_travelers ?? 0));
      return { ...next, travelers: total };
    });
  };

  const toggleInterest = (interest: ActivityInterest) => {
    setForm((current) => {
      const currentInterests = current.activity_interests ?? [];
      return {
        ...current,
        activity_interests: currentInterests.includes(interest)
          ? currentInterests.filter((item) => item !== interest)
          : [...currentInterests, interest],
      };
    });
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
            <DateRangeCalendar
              startDate={form.start_date}
              endDate={form.end_date}
              onChange={(range) => setForm((current) => ({
                ...current,
                start_date: range.startDate,
                end_date: range.endDate,
              }))}
            />
            <HelperText type="error" visible={!!errors.start_date}>{errors.start_date}</HelperText>
            <HelperText type="error" visible={!!errors.end_date}>{errors.end_date}</HelperText>

            {form.start_date && form.end_date && (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>
                  {Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / (1000 * 60 * 60 * 24))} nights
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

            <Text style={styles.fieldLabel}>Travelers</Text>
            <TravelerCounter
              label="Male"
              value={form.male_travelers ?? 0}
              onMinus={() => updateTravelerCount('male_travelers', -1)}
              onPlus={() => updateTravelerCount('male_travelers', 1)}
            />
            <TravelerCounter
              label="Female"
              value={form.female_travelers ?? 0}
              onMinus={() => updateTravelerCount('female_travelers', -1)}
              onPlus={() => updateTravelerCount('female_travelers', 1)}
            />
            <Text style={styles.travelerTotal}>{form.travelers ?? 1} total traveler{(form.travelers ?? 1) > 1 ? 's' : ''}</Text>
            <HelperText type="error" visible={!!errors.travelers}>{errors.travelers}</HelperText>

            <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>Activity interests</Text>
            <View style={styles.interestGrid}>
              {ACTIVITY_INTERESTS.map((interest) => {
                const selected = (form.activity_interests ?? []).includes(interest.value);
                return (
                  <TouchableOpacity
                    key={interest.value}
                    style={[styles.interestChip, selected && styles.interestChipSelected]}
                    onPress={() => toggleInterest(interest.value)}
                  >
                    <Text style={[styles.interestText, selected && styles.interestTextSelected]}>
                      {interest.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

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
          loading={isPending || isSubmitting}
          disabled={isPending || isSubmitting}
          style={styles.nextButton}
          contentStyle={styles.nextButtonContent}
        >
          {step === STEPS.length - 1 ? 'Generate Packing List' : 'Next'}
        </Button>
      </View>

      <Snackbar
        visible={!!submitError}
        onDismiss={() => setSubmitError('')}
        duration={5000}
        action={{ label: 'Dismiss', onPress: () => setSubmitError('') }}
      >
        {submitError}
      </Snackbar>
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
  counterRow: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  counterLabel: { ...Typography.body, color: Colors.onSurface, fontWeight: '600' },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  counterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonText: { fontSize: 22, color: Colors.primary, lineHeight: 24 },
  counterValue: { ...Typography.h3, color: Colors.onSurface, minWidth: 24, textAlign: 'center' },
  travelerTotal: { ...Typography.caption, color: Colors.muted, marginTop: -4 },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  interestChip: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  interestChipSelected: { backgroundColor: '#e8f0fe', borderColor: Colors.primary },
  interestText: { ...Typography.caption, color: Colors.muted },
  interestTextSelected: { color: Colors.primary, fontWeight: '700' },
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

function TravelerCounter({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.counterRow}>
      <Text style={styles.counterLabel}>{label}</Text>
      <View style={styles.counterControls}>
        <TouchableOpacity style={styles.counterButton} onPress={onMinus}>
          <Text style={styles.counterButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.counterValue}>{value}</Text>
        <TouchableOpacity style={styles.counterButton} onPress={onPlus}>
          <Text style={styles.counterButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
