import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'RecordVitals'>;
  route: RouteProp<PatientStackParams, 'RecordVitals'>;
};

export default function RecordVitalsScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const { vitalRepo } = useInjection();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: definitions, isLoading } = useQuery({
    queryKey: ['vital-definitions', patientId],
    queryFn: () => vitalRepo.listDefinitions(patientId),
  });

  const handleSave = async () => {
    if (!definitions) return;
    setSaving(true);
    try {
      await Promise.all(
        definitions
          .filter((d) => values[d.id])
          .map((d) => vitalRepo.recordVital(patientId, d.id, parseFloat(values[d.id]))),
      );
      await queryClient.invalidateQueries({ queryKey: ['vital-records', patientId] });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los registros.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#2D7DD2" /></ScreenBackground>;

  return (
    <ScreenBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.sheet}>
          {definitions?.map((def) => (
            <View key={def.id} style={styles.field}>
              <Text style={styles.label}>{def.name} ({def.unit})</Text>
              <TextInput
                style={styles.input}
                placeholder={`Valor${def.minValue != null ? ` (${def.minValue}-${def.maxValue})` : ''}`}
                keyboardType="numeric"
                value={values[def.id] ?? ''}
                onChangeText={(v) => setValues((prev) => ({ ...prev, [def.id]: v }))}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar Registros</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 20 },
  sheet: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: 20 },
  field: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '500', color: '#333', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: '#2D7DD2', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
