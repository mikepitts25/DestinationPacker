import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors, Spacing, Typography } from '@/constants/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: startOffset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isWithin(date: string, start?: string, end?: string) {
  if (!start || !end) return false;
  return date > start && date < end;
}

export function DateRangeCalendar({
  startDate,
  endDate,
  onChange,
}: {
  startDate?: string;
  endDate?: string;
  onChange: (range: { startDate?: string; endDate?: string }) => void;
}) {
  const initialMonth = startDate ? parseDate(startDate) : new Date();
  const [month, setMonth] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  const [previewEnd, setPreviewEnd] = useState<string | undefined>();
  const today = formatDate(new Date());
  const cells = useMemo(() => monthDays(month), [month]);
  const visibleEnd = endDate ?? previewEnd;

  const selectDate = (date: string) => {
    if (!startDate || endDate || date < startDate) {
      onChange({ startDate: date, endDate: undefined });
      setPreviewEnd(undefined);
      return;
    }

    onChange({ startDate, endDate: date });
    setPreviewEnd(undefined);
  };

  return (
    <View style={styles.container}>
      <View style={styles.monthHeader}>
        <Pressable onPress={() => setMonth((current) => addMonths(current, -1))} style={styles.monthButton}>
          <Text style={styles.monthButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable onPress={() => setMonth((current) => addMonths(current, 1))} style={styles.monthButton}>
          <Text style={styles.monthButtonText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, index) => {
          if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;

          const value = formatDate(date);
          const disabled = value < today;
          const isStart = value === startDate;
          const isEnd = value === endDate;
          const inPreview = !!startDate && !endDate && !!previewEnd && isWithin(value, startDate, previewEnd);
          const inRange = isWithin(value, startDate, visibleEnd);
          const highlighted = isStart || isEnd || inRange || inPreview;

          return (
            <Pressable
              key={value}
              disabled={disabled}
              onPress={() => selectDate(value)}
              onHoverIn={() => {
                if (startDate && !endDate && value > startDate) setPreviewEnd(value);
              }}
              style={[
                styles.dayCell,
                highlighted && styles.dayHighlighted,
                (isStart || isEnd) && styles.dayEndpoint,
                disabled && styles.dayDisabled,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  highlighted && styles.dayTextHighlighted,
                  (isStart || isEnd) && styles.dayTextEndpoint,
                  disabled && styles.dayTextDisabled,
                ]}
              >
                {date.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.helpText}>
        {startDate && !endDate ? 'Select a return date to complete the trip range.' : 'Select a departure date, then a return date.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  monthButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthButtonText: { fontSize: 28, color: Colors.primary },
  monthTitle: { ...Typography.h3, color: Colors.onSurface },
  weekRow: { flexDirection: 'row', marginBottom: Spacing.xs },
  weekday: { ...Typography.caption, color: Colors.muted, width: `${100 / 7}%`, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dayHighlighted: { backgroundColor: '#e8f0fe' },
  dayEndpoint: { backgroundColor: Colors.primary },
  dayDisabled: { opacity: 0.35 },
  dayText: { ...Typography.body, color: Colors.onSurface },
  dayTextHighlighted: { color: Colors.primary, fontWeight: '700' },
  dayTextEndpoint: { color: '#fff' },
  dayTextDisabled: { color: Colors.muted },
  helpText: { ...Typography.caption, color: Colors.muted, marginTop: Spacing.sm, textAlign: 'center' },
});
