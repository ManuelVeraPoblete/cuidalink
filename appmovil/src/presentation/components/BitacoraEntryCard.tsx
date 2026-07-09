import { View, Text, StyleSheet } from 'react-native';
import { BitacoraEntry } from '@/domain/entities';
import { pickBitacoraEntryStyle } from '@/domain/utils/bitacoraDisplay';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  entry: BitacoraEntry;
};

export default function BitacoraEntryCard({ entry }: Props) {
  const recordedAt = new Date(entry.recordedAt);
  const dateLabel = recordedAt.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeLabel = recordedAt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const badge = pickBitacoraEntryStyle(entry.type);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.dateText}>{dateLabel}</Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color="#5ee7df" />
            <Text style={styles.timeText}>{timeLabel}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.color }]}>
          <Text style={styles.badgeText}>{badge.label}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <Text style={styles.note}>{entry.note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 16,
    marginBottom: 16,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dateText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { color: '#a5d8f3', fontSize: 13, fontWeight: '600' },
  badge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 12 },
  note: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 },
});
