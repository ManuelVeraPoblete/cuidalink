import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { pickVitalIcon } from '@/domain/utils/vitalDisplay';
import { DEFAULT_VITAL_DEFINITIONS } from '@/domain/utils/defaultVitalDefinitions';
import PatientChip from '@/presentation/components/PatientChip';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'RecordVitals'>;
  route: RouteProp<PatientStackParams, 'RecordVitals'>;
};

function isObservation(name: string): boolean {
  return /observ/i.test(name);
}

export default function RecordVitalsScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const { vitalRepo, patientRepo } = useInjection();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientRepo.getPatient(patientId),
  });

  const { data: definitions, isLoading } = useQuery({
    queryKey: ['vital-definitions', patientId],
    queryFn: () => vitalRepo.listDefinitions(patientId),
  });

  const noDefinitions = !!definitions && definitions.length === 0;
  const shouldSeedDefaults = noDefinitions && !!patient?.isOwner;

  const seedMutation = useMutation({
    mutationFn: async () => {
      for (const def of DEFAULT_VITAL_DEFINITIONS) {
        await vitalRepo.createDefinition(patientId, def);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vital-definitions', patientId] }),
  });

  useEffect(() => {
    if (shouldSeedDefaults && seedMutation.status === 'idle') {
      seedMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSeedDefaults]);

  const handleSave = async () => {
    if (!definitions) return;
    const measurements = definitions
      .filter((d) => values[d.id])
      .map((d) => ({ definitionId: d.id, value: values[d.id] }));
    if (measurements.length === 0) return;
    setSaving(true);
    try {
      await vitalRepo.recordVitals(patientId, measurements);
      await queryClient.invalidateQueries({ queryKey: ['vital-records', patientId] });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los registros.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#5ee7df" /></ScreenBackground>;

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 20, paddingTop: 24, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerLogoRow}>
            <Image
              source={require('../../../../assets/cuidalink-icon.png')}
              style={styles.headerLogoIcon}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>
              <Text style={styles.headerCuida}>Cuida</Text>
              <Text style={styles.headerLink}>Link</Text>
            </Text>
          </View>
          <View style={styles.backButtonSpacer} />
        </View>

        <Text style={styles.title}>Registrar signos vitales</Text>
        <Text style={styles.subtitle}>Registra las mediciones del paciente</Text>

        {patient && <PatientChip name={patient.fullName} />}

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color="#a5d8f3" />
          <Text style={styles.infoText}>Todos los campos son opcionales</Text>
        </View>

        {noDefinitions ? (
          <View style={styles.card}>
            {patient && !patient.isOwner ? (
              <Text style={styles.emptyText}>Aún no hay signos vitales configurados para este paciente.</Text>
            ) : (
              <>
                <ActivityIndicator color="#5ee7df" />
                <Text style={styles.emptyText}>Configurando signos vitales por primera vez…</Text>
              </>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.grid}>
              {definitions?.filter((def) => !isObservation(def.name)).map((def) => {
                const iconStyle = pickVitalIcon(def.name);
                const label = def.unit ? `${def.name} (${def.unit})` : def.name;
                return (
                  <View key={def.id} style={styles.gridItem}>
                    <View style={styles.labelRow}>
                      <View style={[styles.iconBadge, { backgroundColor: iconStyle.color }]}>
                        <Ionicons name={iconStyle.icon} size={14} color="#fff" />
                      </View>
                      <Text style={styles.label}>{label}</Text>
                    </View>
                    <TextInput
                      testID={`vital-input-${def.id}`}
                      style={styles.input}
                      placeholder={`Valor${def.normalRangeMin != null ? ` (${def.normalRangeMin}-${def.normalRangeMax})` : ''}`}
                      placeholderTextColor="#7c93ab"
                      keyboardType="numeric"
                      value={values[def.id] ?? ''}
                      onChangeText={(v) => setValues((prev) => ({ ...prev, [def.id]: v }))}
                    />
                  </View>
                );
              })}
            </View>

            {definitions?.filter((def) => isObservation(def.name)).map((def) => {
              const iconStyle = pickVitalIcon(def.name);
              return (
                <View key={def.id} style={styles.field}>
                  <View style={styles.labelRow}>
                    <View style={[styles.iconBadge, { backgroundColor: iconStyle.color }]}>
                      <Ionicons name={iconStyle.icon} size={14} color="#fff" />
                    </View>
                    <Text style={styles.label}>{def.name}</Text>
                  </View>
                  <TextInput
                    testID={`vital-input-${def.id}`}
                    style={[styles.input, styles.textarea]}
                    placeholder="Valor"
                    placeholderTextColor="#7c93ab"
                    keyboardType="default"
                    multiline
                    numberOfLines={3}
                    value={values[def.id] ?? ''}
                    onChangeText={(v) => setValues((prev) => ({ ...prev, [def.id]: v }))}
                  />
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Guardar registro</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  backButtonSpacer: { width: 44 },
  headerLogoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerLogoIcon: { width: 32, height: 32 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  headerCuida: { color: '#fff' },
  headerLink: { color: '#38bdf8' },

  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#a5d8f3', marginTop: 4, marginBottom: 16 },

  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  infoText: { color: '#a5d8f3', fontSize: 13 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 20,
    marginBottom: 24,
  },
  field: { marginBottom: 20 },
  emptyText: { color: '#a5d8f3', fontSize: 14, textAlign: 'center', marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { width: '47%', marginBottom: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  iconBadge: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 48, color: '#fff', fontSize: 15,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },

  footerRow: { flexDirection: 'row', gap: 12 },
  saveButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 16,
    paddingVertical: 16,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelButton: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#5ee7df', borderRadius: 16,
    paddingVertical: 14,
  },
  cancelButtonText: { color: '#5ee7df', fontWeight: 'bold', fontSize: 16 },
});
