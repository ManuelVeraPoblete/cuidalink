import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VitalRecord, VitalSignDefinition } from '@/domain/entities';
import { pickVitalIcon } from '@/domain/utils/vitalDisplay';

type Props = {
  record: VitalRecord;
  definitionsById: Map<string, VitalSignDefinition>;
  onViewDetail: () => void;
};

function isObservation(name: string): boolean {
  return /observ/i.test(name);
}

export default function VitalCard({ record, definitionsById, onViewDetail }: Props) {
  const recordedAt = new Date(record.recordedAt);
  const dateLabel = recordedAt.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeLabel = recordedAt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  const fields = record.measurements
    .map((m) => ({ measurement: m, definition: definitionsById.get(m.definitionId) }))
    .filter((f) => f.definition && !isObservation(f.definition.name));
  const observation = record.measurements
    .map((m) => ({ measurement: m, definition: definitionsById.get(m.definitionId) }))
    .find((f) => f.definition && isObservation(f.definition.name));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerItem}>
          <Ionicons name="calendar-outline" size={16} color="#5ee7df" />
          <Text style={styles.headerText}>{dateLabel}</Text>
        </View>
        <View style={styles.headerItem}>
          <Ionicons name="time-outline" size={16} color="#5ee7df" />
          <Text style={styles.headerText}>{timeLabel}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {fields.map(({ measurement, definition }) => {
          const def = definition as VitalSignDefinition;
          const iconStyle = pickVitalIcon(def.name);
          return (
            <View key={measurement.definitionId} style={styles.cell}>
              <View style={[styles.iconBadge, { backgroundColor: iconStyle.color }]}>
                <Ionicons name={iconStyle.icon} size={18} color="#fff" />
              </View>
              <View>
                <Text style={styles.cellLabel}>{def.name}</Text>
                <Text style={styles.cellValue}>
                  {def.unit ? `${measurement.value} ${def.unit}` : measurement.value}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {observation && observation.definition && (
        <View style={styles.observations}>
          <View style={styles.observationsHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#5ee7df" />
            <Text style={styles.observationsLabel}>{observation.definition.name}</Text>
          </View>
          <Text style={styles.observationsText}>{observation.measurement.value}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.detailButton} onPress={onViewDetail}>
        <Text style={styles.detailButtonText}>Ver detalle</Text>
      </TouchableOpacity>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  headerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerText: { color: '#a5d8f3', fontSize: 13, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, padding: 10,
  },
  iconBadge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cellLabel: { color: '#a5d8f3', fontSize: 12 },
  cellValue: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  observations: {
    marginTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 12,
  },
  observationsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  observationsLabel: { color: '#5ee7df', fontWeight: 'bold', fontSize: 13 },
  observationsText: { color: '#e2e8f0', fontSize: 14 },

  detailButton: {
    alignSelf: 'center', marginTop: 14,
    borderWidth: 1, borderColor: '#5ee7df', borderRadius: 16,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  detailButtonText: { color: '#5ee7df', fontWeight: 'bold', fontSize: 14 },
});
