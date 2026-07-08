import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { VitalRecord, VitalSignDefinition } from '@/domain/entities';

type Props = {
  visible: boolean;
  record: VitalRecord | null;
  definitionsById: Map<string, VitalSignDefinition>;
  onClose: () => void;
};

function isOutOfRange(value: string, definition: VitalSignDefinition): boolean {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return false;
  if (definition.normalRangeMin != null && numeric < definition.normalRangeMin) return true;
  if (definition.normalRangeMax != null && numeric > definition.normalRangeMax) return true;
  return false;
}

export default function VitalRecordDetailModal({ visible, record, definitionsById, onClose }: Props) {
  if (!record) return null;

  const recordedAt = new Date(record.recordedAt);
  const fullDateLabel = recordedAt.toLocaleString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Detalle del registro</Text>
          <Text style={styles.date}>{fullDateLabel}</Text>

          {record.measurements.map((measurement) => {
            const definition = definitionsById.get(measurement.definitionId);
            if (!definition) return null;
            const outOfRange = isOutOfRange(measurement.value, definition);
            return (
              <View key={measurement.definitionId} style={styles.row}>
                <Text style={styles.rowLabel}>{definition.name}</Text>
                <Text style={[styles.rowValue, outOfRange && styles.rowValueWarning]}>
                  {definition.unit ? `${measurement.value} ${definition.unit}` : measurement.value}
                </Text>
              </View>
            );
          })}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
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
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4, textAlign: 'center' },
  date: { fontSize: 13, color: '#a5d8f3', marginBottom: 16, textAlign: 'center' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  rowLabel: { color: '#a5d8f3', fontSize: 14 },
  rowValue: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  rowValueWarning: { color: '#e6b800' },
  closeBtn: { alignItems: 'center', padding: 12, marginTop: 16 },
  closeText: { color: '#a5d8f3', fontWeight: 'bold' },
});
