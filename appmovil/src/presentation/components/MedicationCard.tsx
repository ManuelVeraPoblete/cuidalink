import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MedicationLog } from '@/domain/entities';

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f6ad55',
  CONFIRMED: '#68d391',
  MISSED: '#fc8181',
  ESCALATED: '#e53e3e',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  MISSED: 'Omitido',
  ESCALATED: 'Escalado',
};

type Props = {
  log: MedicationLog;
  onConfirm: () => void;
  onMiss: () => void;
};

export default function MedicationCard({ log, onConfirm, onMiss }: Props) {
  const isPending = log.status === 'PENDING' || log.status === 'ESCALATED';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{log.medicationName}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[log.status] }]}>
          <Text style={styles.badgeText}>{STATUS_LABEL[log.status]}</Text>
        </View>
      </View>
      <Text style={styles.dosage}>{log.dosage}</Text>
      <Text style={styles.time}>{new Date(log.scheduledAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</Text>
      {isPending && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
            <Text style={styles.confirmText}>Confirmar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.missBtn} onPress={onMiss}>
            <Text style={styles.missText}>Omitir</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  name: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', flex: 1 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  dosage: { fontSize: 13, color: '#555' },
  time: { fontSize: 12, color: '#aaa', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  confirmBtn: { flex: 1, backgroundColor: '#68d391', padding: 10, borderRadius: 8, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '600' },
  missBtn: { flex: 1, backgroundColor: '#f5f5f5', padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  missText: { color: '#555', fontWeight: '600' },
});
