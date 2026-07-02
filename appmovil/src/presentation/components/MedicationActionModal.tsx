import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MedicationLog } from '@/domain/entities';

type Props = {
  visible: boolean;
  log: MedicationLog | null;
  onConfirm: () => void;
  onMiss: () => void;
  onClose: () => void;
};

export default function MedicationActionModal({ visible, log, onConfirm, onMiss, onClose }: Props) {
  if (!log) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.name}>{log.medicationName}</Text>
          <Text style={styles.details}>
            {log.dosage} · {new Date(log.scheduledAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.missBtn} onPress={onMiss}>
              <Text style={styles.missText}>Omitir</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dialog: {
    backgroundColor: '#12283f', borderRadius: 16, padding: 24, width: '85%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  name: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4, textAlign: 'center' },
  details: { fontSize: 14, color: '#a5d8f3', marginBottom: 20, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  confirmBtn: { flex: 1, backgroundColor: '#1a9c7d', padding: 12, borderRadius: 10, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: 'bold' },
  missBtn: { flex: 1, backgroundColor: '#e05555', padding: 12, borderRadius: 10, alignItems: 'center' },
  missText: { color: '#fff', fontWeight: 'bold' },
  closeBtn: { alignItems: 'center', padding: 8 },
  closeText: { color: '#a5d8f3' },
});
