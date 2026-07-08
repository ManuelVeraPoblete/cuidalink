import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = { name: string };

export default function PatientChip({ name }: Props) {
  return (
    <View style={styles.chip}>
      <Ionicons name="person-outline" size={16} color="#5ee7df" />
      <Text style={styles.text}>{`Paciente: ${name}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16,
  },
  text: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
