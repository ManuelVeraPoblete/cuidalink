import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CareTaskLog, CareTaskLogStatus } from '@/domain/entities';
import { pickTaskIcon } from '@/domain/utils/careTaskDisplay';

const STATUS_BADGE: Record<CareTaskLogStatus, { label: string; bg: string; textColor: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PENDING: { label: 'Pendiente', bg: '#e6b800', textColor: '#3d2e00', icon: 'time-outline' },
  DONE: { label: 'Realizada', bg: '#1a9c7d', textColor: '#fff', icon: 'checkmark-circle' },
};

type Props = {
  log: CareTaskLog;
  onPress?: () => void;
};

export default function TaskCard({ log, onPress }: Props) {
  const iconStyle = pickTaskIcon(log.taskName);
  const badge = STATUS_BADGE[log.status];
  const clickable = log.status === 'PENDING' && !!onPress;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!clickable}
      activeOpacity={clickable ? 0.8 : 1}
    >
      <View style={[styles.iconBadge, { backgroundColor: iconStyle.color }]}>
        <Ionicons name={iconStyle.icon} size={24} color="#fff" />
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{log.taskName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={14} color={badge.textColor} />
            <Text style={[styles.statusText, { color: badge.textColor }]}>{badge.label}</Text>
          </View>
        </View>
        <View style={styles.detailsRow}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Hora</Text>
            <Text style={styles.detailValue}>
              {new Date(log.scheduledAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={[styles.detailColumn, { flex: 2 }]}>
            <Text style={styles.detailLabel}>Indicaciones</Text>
            <Text style={styles.detailValue}>{log.instructions || '—'}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#7dd3fc" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  iconBadge: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 17, fontWeight: 'bold', color: '#fff', flex: 1, marginRight: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  detailsRow: { flexDirection: 'row', gap: 16 },
  detailColumn: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#5ee7df', fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: 13, color: '#e2e8f0' },
});
