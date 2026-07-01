import { View, Text, StyleSheet } from 'react-native';
import { VitalRecord } from '@/domain/entities';

type Props = { record: VitalRecord };

export default function VitalCard({ record }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.name}>{record.definitionName}</Text>
        <Text style={styles.value}>{record.value} <Text style={styles.unit}>{record.unit}</Text></Text>
      </View>
      <Text style={styles.date}>{new Date(record.recordedAt).toLocaleString('es-CL')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  value: { fontSize: 18, fontWeight: 'bold', color: '#2D7DD2' },
  unit: { fontSize: 13, fontWeight: 'normal', color: '#888' },
  date: { fontSize: 12, color: '#aaa', marginTop: 4 },
});
