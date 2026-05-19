import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Text, TextInput, HelperText, Snackbar, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCreateTrip } from '@/hooks/useTrips';
import { packingApi, weatherApi } from '@/services/api';
import { DateRangeCalendar } from '@/components/DateRangeCalendar';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { ACTIVITY_INTEREST_GROUPS } from '@/lib/activities/interests';
import type { AccommodationType, ActivityInterest, TravelMethod, TripCreate, TripLeg } from '@/types';

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
  { value: 'friends_family', label: "Friends/Family", emoji: '🏘️' },
];

function durationDays(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  return Number.isFinite(days) ? Math.max(1, days) : 0;
}

function currentLegFromForm(form: Partial<TripCreate>): TripLeg | null {
  if (!form.destination || !form.start_date || !form.end_date || !form.travel_method || !form.accommodation) {
    return null;
  }

  return {
    destination: form.destination,
    latitude: form.latitude ?? null,
    longitude: form.longitude ?? null,
    country_code: form.country_code ?? null,
    start_date: form.start_date,
    end_date: form.end_date,
    travel_method: form.travel_method,
    accommodation: form.accommodation,
  };
}

export default function NewTripScreen() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Partial<TripCreate>>({
    travelers: 1,
    male_travelers: 1,
    female_travelers: 0,
    children: 0,
    pets: 0,
    has_laundry_access: false,
    legs: [],
    activity_interests: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [destQuery, setDestQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ place_id: string; description: string }[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { mutateAsync: createTrip, isPending } = useCreateTrip();
  const progress = (step + 1) / STEPS.length;

  const handleDestinationSearch = useCallback((query: string) => {
    setDestQuery(query);
    setForm((f) => ({ ...f, destination: query }));
    if (searchTimeout) clearTimeout(searchTimeout);
    if (query.length < 2) { setSuggestions([]); return; }
    const timeout = setTimeout(async () => {
      try { setSuggestions(await weatherApi.autocomplete(query)); }
      catch { setSuggestions([]); }
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
        setForm((f) => ({ ...f, latitude: details.lat, longitude: details.lon, country_code: details.country_code ?? undefined }));
      }
    } catch {}
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 0 && !form.destination) errs.destination = 'Please enter a destination';
    if (step === 1) {
      if (!form.start_date) errs.start_date = 'Please select a start date';
      if (!form.end_date) errs.end_date = 'Please select an end date';
      if (form.start_date && form.end_date && form.start_date > form.end_date) errs.end_date = 'End date must be after start date';
    }
    if (step === 2 && !form.travel_method) errs.travel_method = 'Please select a travel method';
    if (step === 3 && !form.accommodation) errs.accommodation = 'Please select accommodation';
    if (step === 4 && ((form.male_travelers ?? 0) + (form.female_travelers ?? 0) + (form.children ?? 0)) < 1) errs.travelers = 'Please add at least one traveler';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const male = Math.max(0, form.male_travelers ?? 0);
      const female = Math.max(0, form.female_travelers ?? 0);
      const children = Math.max(0, form.children ?? 0);
      const pets = Math.max(0, form.pets ?? 0);
      const currentLeg = currentLegFromForm(form);
      const legs = [...(form.legs ?? []), ...(currentLeg ? [currentLeg] : [])];
      const primaryLeg = legs[0] ?? currentLeg;
      const trip = await createTrip({
        ...form,
        destination: primaryLeg?.destination ?? form.destination,
        latitude: primaryLeg?.latitude ?? form.latitude,
        longitude: primaryLeg?.longitude ?? form.longitude,
        country_code: primaryLeg?.country_code ?? form.country_code,
        start_date: legs[0]?.start_date ?? form.start_date,
        end_date: legs[legs.length - 1]?.end_date ?? form.end_date,
        travel_method: primaryLeg?.travel_method ?? form.travel_method,
        accommodation: primaryLeg?.accommodation ?? form.accommodation,
        travelers: Math.max(1, male + female + children),
        male_travelers: male,
        female_travelers: female,
        children,
        pets,
        legs,
        activity_interests: form.activity_interests ?? [],
      } as TripCreate);
      try { await packingApi.generate(trip.id); } catch {}
      router.replace(`/trip/${trip.id}`);
    } catch (err: any) {
      if (err.isPaymentRequired) router.push('/premium');
      else if (err.isUnauthorized) setSubmitError('Session expired — please sign in again.');
      else setSubmitError(err.message || 'Failed to create trip. Check your connection and try again.');
    } finally { setIsSubmitting(false); }
  };

  const updateTravelerCount = (field: 'male_travelers' | 'female_travelers' | 'children', delta: number) => {
    setForm((cur) => {
      const next = { ...cur, [field]: Math.max(0, (cur[field] ?? 0) + delta) };
      return { ...next, travelers: Math.max(1, (next.male_travelers ?? 0) + (next.female_travelers ?? 0) + (next.children ?? 0)) };
    });
  };

  const updatePetCount = (delta: number) => {
    setForm((cur) => ({ ...cur, pets: Math.max(0, (cur.pets ?? 0) + delta) }));
  };

  const toggleInterest = (interest: ActivityInterest) => {
    setForm((cur) => {
      const list = cur.activity_interests ?? [];
      return { ...cur, activity_interests: list.includes(interest) ? list.filter(i => i !== interest) : [...list, interest] };
    });
  };

  const handleAddAnotherLeg = () => {
    if (!validate()) return;
    const leg = currentLegFromForm(form);
    if (!leg) return;
    setForm((cur) => ({
      ...cur,
      legs: [...(cur.legs ?? []), leg],
      destination: '',
      latitude: undefined,
      longitude: undefined,
      country_code: undefined,
      start_date: undefined,
      end_date: undefined,
      travel_method: undefined,
      accommodation: undefined,
    }));
    setDestQuery('');
    setSuggestions([]);
    setStep(0);
  };

  const tripDays = durationDays(form.start_date, form.end_date);
  const shouldShowLaundry = tripDays > 10 || (form.has_laundry_access && tripDays > 0);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Gradient header strip */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.deepDark }}>
        <LinearGradient
          colors={[Colors.deepDark, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerStrip}
        >
          <View style={styles.headerRow}>
            {step > 0 ? (
              <TouchableOpacity onPress={() => setStep(s => s - 1)} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>←</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.headerBtn} />
            )}
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{STEPS[step]}</Text>
              <Text style={styles.headerSub}>Step {step + 1} of {STEPS.length}</Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Gold progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </LinearGradient>
      </SafeAreaView>

      {/* White body */}
      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
                mode="outlined"
                outlineColor={Colors.border}
                activeOutlineColor={Colors.primary}
              />
              <HelperText type="error" visible={!!errors.destination}>{errors.destination}</HelperText>
              {suggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {suggestions.map((s) => (
                    <TouchableOpacity key={s.place_id} style={styles.suggestionRow} onPress={() => handleSelectPlace(s)}>
                      <Text style={styles.suggestionText}>📍 {s.description}</Text>
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
                onChange={(range) => {
                  const days = durationDays(range.startDate, range.endDate);
                  setForm((cur) => ({
                    ...cur,
                    start_date: range.startDate,
                    end_date: range.endDate,
                    has_laundry_access: cur.has_laundry_access || days > 14,
                  }));
                }}
              />
              <HelperText type="error" visible={!!errors.start_date}>{errors.start_date}</HelperText>
              <HelperText type="error" visible={!!errors.end_date}>{errors.end_date}</HelperText>
              {form.start_date && form.end_date && (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>
                    🌙 {Math.max(0, tripDays - 1)} nights
                  </Text>
                </View>
              )}
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.question}>How are you getting there? 🚀</Text>
              {TRAVEL_METHODS.map((m) => {
                const sel = form.travel_method === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.optionCard, sel && styles.optionCardSelected]}
                    onPress={() => setForm((f) => ({ ...f, travel_method: m.value }))}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.optionEmoji}>{m.emoji}</Text>
                    <Text style={[styles.optionLabel, sel && styles.optionLabelSelected]}>{m.label}</Text>
                    {sel && <Text style={styles.optionCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
              <HelperText type="error" visible={!!errors.travel_method}>{errors.travel_method}</HelperText>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.question}>Where are you staying? 🏨</Text>
              <View style={styles.grid}>
                {ACCOMMODATION_TYPES.map((a) => {
                  const sel = form.accommodation === a.value;
                  return (
                    <TouchableOpacity
                      key={a.value}
                      style={[styles.gridCard, sel && styles.optionCardSelected]}
                      onPress={() => setForm((f) => ({ ...f, accommodation: a.value }))}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.optionEmoji}>{a.emoji}</Text>
                      <Text style={[styles.gridLabel, sel && styles.optionLabelSelected]}>{a.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {(form.legs?.length ?? 0) > 0 && (
                <View style={styles.savedLegsBox}>
                  <Text style={styles.savedLegsTitle}>Saved legs</Text>
                  {form.legs?.map((leg, index) => (
                    <Text key={`${leg.destination}-${index}`} style={styles.savedLeg}>
                      {index + 1}. {leg.destination} · {leg.travel_method.replace('_', ' ')} · {leg.accommodation}
                    </Text>
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.addLegBtn} onPress={handleAddAnotherLeg}>
                <Text style={styles.addLegText}>+ Add another leg</Text>
              </TouchableOpacity>
              <HelperText type="error" visible={!!errors.accommodation}>{errors.accommodation}</HelperText>
            </View>
          )}

          {step === 4 && (
            <View>
              <Text style={styles.question}>Almost done! 🎉</Text>

              <Text style={styles.fieldLabel}>Travelers</Text>
              <TravelerCounter label="👨 Male" value={form.male_travelers ?? 0} onMinus={() => updateTravelerCount('male_travelers', -1)} onPlus={() => updateTravelerCount('male_travelers', 1)} />
              <TravelerCounter label="👩 Female" value={form.female_travelers ?? 0} onMinus={() => updateTravelerCount('female_travelers', -1)} onPlus={() => updateTravelerCount('female_travelers', 1)} />
              <TravelerCounter label="🧒 Children" value={form.children ?? 0} onMinus={() => updateTravelerCount('children', -1)} onPlus={() => updateTravelerCount('children', 1)} />
              <TravelerCounter label="🐾 Pets" value={form.pets ?? 0} onMinus={() => updatePetCount(-1)} onPlus={() => updatePetCount(1)} />
              <Text style={styles.travelerTotal}>{form.travelers ?? 1} traveler{(form.travelers ?? 1) > 1 ? 's' : ''}{(form.pets ?? 0) > 0 ? ` + ${form.pets} pet${(form.pets ?? 0) > 1 ? 's' : ''}` : ''}</Text>
              <HelperText type="error" visible={!!errors.travelers}>{errors.travelers}</HelperText>

              <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>Activity interests</Text>
              {ACTIVITY_INTEREST_GROUPS.map((group) => (
                <View key={group.title} style={styles.interestGroup}>
                  <Text style={styles.interestGroupTitle}>{group.title}</Text>
                  <View style={styles.interestGrid}>
                    {group.options.map((interest) => {
                      const sel = (form.activity_interests ?? []).includes(interest.value);
                      return (
                        <TouchableOpacity
                          key={interest.value}
                          style={[styles.interestChip, sel && styles.interestChipSelected]}
                          onPress={() => toggleInterest(interest.value)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.interestEmoji}>{interest.emoji}</Text>
                          <Text style={[styles.interestText, sel && styles.interestTextSelected]}>{interest.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              {shouldShowLaundry && (
                <TouchableOpacity
                  style={styles.laundryRow}
                  onPress={() => setForm((cur) => ({ ...cur, has_laundry_access: !cur.has_laundry_access }))}
                  activeOpacity={0.8}
                >
                  <View style={[styles.laundryCheck, form.has_laundry_access && styles.laundryCheckActive]}>
                    {form.has_laundry_access && <Text style={styles.laundryCheckText}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.laundryTitle}>Laundry available?</Text>
                    <Text style={styles.laundrySub}>For longer trips, this keeps clothing quantities around one week.</Text>
                  </View>
                </TouchableOpacity>
              )}

              <TextInput
                label="Notes (optional)"
                value={form.notes ?? ''}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                placeholder="Any special considerations..."
                multiline
                numberOfLines={3}
                style={[styles.input, { marginTop: Spacing.md }]}
                mode="outlined"
                outlineColor={Colors.border}
                activeOutlineColor={Colors.primary}
              />
            </View>
          )}
        </ScrollView>

        {/* Footer CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextBtn, (isPending || isSubmitting) && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={isPending || isSubmitting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.gold, Colors.goldDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtnGradient}
            >
              {(isPending || isSubmitting)
                ? <ActivityIndicator color="#FFFFFF" size={20} />
                : <Text style={styles.nextBtnText}>{step === STEPS.length - 1 ? '✨ Generate Packing List' : 'Next →'}</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <Snackbar visible={!!submitError} onDismiss={() => setSubmitError('')} duration={5000} action={{ label: 'Dismiss', onPress: () => setSubmitError('') }}>
        {submitError}
      </Snackbar>
    </View>
  );
}

function TravelerCounter({ label, value, onMinus, onPlus }: { label: string; value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.counterRow}>
      <Text style={styles.counterLabel}>{label}</Text>
      <View style={styles.counterControls}>
        <TouchableOpacity style={styles.counterBtn} onPress={onMinus}><Text style={styles.counterBtnText}>−</Text></TouchableOpacity>
        <Text style={styles.counterVal}>{value}</Text>
        <TouchableOpacity style={styles.counterBtn} onPress={onPlus}><Text style={styles.counterBtnText}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.deepDark },
  headerStrip: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  headerBtn: { width: 40, alignItems: 'center' },
  headerBtnText: { fontSize: 20, color: '#FFF9F4' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF9F4' },
  headerSub: { fontSize: 12, color: 'rgba(255,249,244,0.6)' },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 2 },
  body: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -4,
    overflow: 'hidden',
  },
  content: { padding: Spacing.lg, paddingBottom: 120 },
  question: { fontSize: 22, fontWeight: '700', color: Colors.onSurface, marginBottom: Spacing.lg },
  input: { marginBottom: Spacing.xs, backgroundColor: Colors.surface },
  suggestionsBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginTop: -4,
  },
  suggestionRow: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggestionText: { fontSize: 14, color: Colors.onSurface },
  durationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(10,147,150,0.1)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  durationText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  optionCardSelected: { borderColor: Colors.primary, backgroundColor: 'rgba(10,147,150,0.06)' },
  optionEmoji: { fontSize: 24, marginRight: Spacing.md },
  optionLabel: { flex: 1, fontSize: 15, color: Colors.onSurface, fontWeight: '500' },
  optionLabelSelected: { color: Colors.primary, fontWeight: '700' },
  optionCheck: { fontSize: 18, color: Colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridCard: {
    width: '47%',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  gridLabel: { fontSize: 12, color: Colors.onSurface, marginTop: 4, textAlign: 'center' },
  savedLegsBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  savedLegsTitle: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 4, textTransform: 'uppercase' },
  savedLeg: { fontSize: 13, color: Colors.onSurface, marginTop: 2 },
  addLegBtn: {
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.md,
    backgroundColor: 'rgba(10,147,150,0.06)',
  },
  addLegText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.muted, marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  counterRow: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  counterLabel: { fontSize: 15, color: Colors.onSurface, fontWeight: '600' },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  counterBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(10,147,150,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  counterBtnText: { fontSize: 22, color: Colors.primary, lineHeight: 24 },
  counterVal: { fontSize: 18, fontWeight: '700', color: Colors.onSurface, minWidth: 24, textAlign: 'center' },
  travelerTotal: { fontSize: 12, color: Colors.muted, marginTop: -4, marginBottom: Spacing.xs },
  interestGroup: { marginBottom: Spacing.sm },
  interestGroupTitle: { fontSize: 12, fontWeight: '700', color: Colors.onSurface, marginBottom: Spacing.xs },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  interestChipSelected: { backgroundColor: 'rgba(10,147,150,0.1)', borderColor: Colors.primary },
  interestEmoji: { fontSize: 16 },
  interestText: { fontSize: 13, color: Colors.muted },
  interestTextSelected: { color: Colors.primary, fontWeight: '700' },
  laundryRow: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  laundryCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laundryCheckActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  laundryCheckText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  laundryTitle: { fontSize: 14, color: Colors.onSurface, fontWeight: '700' },
  laundrySub: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextBtn: { borderRadius: Radius.full, overflow: 'hidden' },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
