import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, HelperText, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCreateTrip } from '@/hooks/useTrips';
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

export default function NewTripScreen() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Partial<TripCreate>>({
    travelers: 1,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutateAsync: createTrip, isPending } = useCreateTrip();

  const progress = (step + 1) / STEPS.length;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 0 && !form.destination) newErrors.destination = 'Please enter a destination';
    if (step === 1) {
      if (!form.start_date) newErrors.start_date = 'Please select a start date';
      if (!form.end_date) newErrors.end_date = 'Please select an end date';
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

      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 && (
          <View>
            <Text style={styles.question}>Where are you going? 🌍</Text>
            <TextInput
              label="Destination"
              value={form.destination ?? ''}
              onChangeText={(v) => setForm((f) => ({ ...f, destination: v }))}
              placeholder="e.g. Tokyo, Japan"
              style={styles.input}
              error={!!errors.destination}
              autoFocus
            />
            <HelperText type="error" visible={!!errors.destination}>{errors.destination}</HelperText>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={styles.question}>When are you traveling? 📅</Text>
            <TextInput
              label="Start date"
              value={form.start_date ?? ''}
              onChangeText={(v) => setForm((f) => ({ ...f, start_date: v }))}
              placeholder="YYYY-MM-DD"
              style={styles.input}
              error={!!errors.start_date}
            />
            <HelperText type="error" visible={!!errors.start_date}>{errors.start_date}</HelperText>
            <TextInput
              label="End date"
              value={form.end_date ?? ''}
              onChangeText={(v) => setForm((f) => ({ ...f, end_date: v }))}
              placeholder="YYYY-MM-DD"
              style={styles.input}
              error={!!errors.end_date}
            />
            <HelperText type="error" visible={!!errors.end_date}>{errors.end_date}</HelperText>
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
            <TextInput
              label="Number of travelers"
              value={String(form.travelers ?? 1)}
              onChangeText={(v) => setForm((f) => ({ ...f, travelers: parseInt(v) || 1 }))}
              keyboardType="number-pad"
              style={styles.input}
            />
            <TextInput
              label="Notes (optional)"
              value={form.notes ?? ''}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              placeholder="Any special considerations..."
              multiline
              numberOfLines={3}
              style={styles.input}
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
