import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { ReportDownloadError } from '@/domain/repositories/ReportRepository';
import { localDateString } from '@/domain/utils/localDate';
import { presetRange, validateReportRange } from '@/domain/utils/reportRange';
import PatientChip from '@/presentation/components/PatientChip';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'Report'>;
  route: RouteProp<PatientStackParams, 'Report'>;
};

const PRESETS = [7, 30, 90] as const;
type Preset = (typeof PRESETS)[number];
type Field = 'from' | 'to';

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function errorAlert(err: unknown) {
  const reason = err instanceof ReportDownloadError ? err.reason : null;
  if (reason === 'NETWORK') {
    Alert.alert('Sin conexión', 'Revisa tu conexión a internet e intenta de nuevo.');
  } else if (reason === 'REJECTED') {
    Alert.alert('No se pudo generar', 'No tienes permiso para generar este informe o el rango no es válido.');
  } else {
    Alert.alert('Error', 'No se pudo generar el informe. Intenta de nuevo más tarde.');
  }
}

export default function ReportScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const { patientRepo, downloadReportUseCase } = useInjection();
  const [preset, setPreset] = useState<Preset | null>(30);
  const [range, setRange] = useState(() => presetRange(30));
  const [pickerField, setPickerField] = useState<Field | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientRepo.getPatient(patientId),
  });

  const rangeError = validateReportRange(range.from, range.to);
  const canGenerate = !rangeError && !generating;

  function selectPreset(days: Preset) {
    setPreset(days);
    setRange(presetRange(days));
  }

  function onPickDate(selected: Date | undefined) {
    const field = pickerField;
    setPickerField(Platform.OS === 'ios' ? field : null);
    if (!selected || !field) return;
    setPreset(null);
    setRange((r) => ({ ...r, [field]: localDateString(selected) }));
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    try {
      await downloadReportUseCase.execute(patientId, range.from, range.to);
    } catch (err) {
      errorAlert(err);
    } finally {
      setGenerating(false);
    }
  }

  if (isLoading) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#5ee7df" /></ScreenBackground>;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Volver">
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerLogoRow}>
            <Image source={require('../../../../assets/cuidalink-icon.png')} style={styles.headerLogoIcon} resizeMode="contain" />
            <Text style={styles.headerTitle}>
              <Text style={styles.headerCuida}>Cuida</Text>
              <Text style={styles.headerLink}>Link</Text>
            </Text>
          </View>
          <View style={styles.backButtonSpacer} />
        </View>

        <Text style={styles.title}>Informe PDF</Text>
        <Text style={styles.subtitle}>Medicamentos y signos vitales del período</Text>

        {patient && <PatientChip name={patient.fullName} />}

        {patient && !patient.isOwner ? (
          <Text style={styles.notice}>Solo el cuidador principal puede generar informes.</Text>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Período</Text>
            <View style={styles.presetRow}>
              {PRESETS.map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[styles.presetChip, preset === days && styles.presetChipActive]}
                  onPress={() => selectPreset(days)}
                >
                  <Text style={[styles.presetText, preset === days && styles.presetTextActive]}>{`Últimos ${days} días`}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.dateRow}>
              {(['from', 'to'] as const).map((field) => (
                <View key={field} style={styles.dateColumn}>
                  <Text style={styles.label}>{field === 'from' ? 'Desde' : 'Hasta'}</Text>
                  <TouchableOpacity
                    testID={`${field}-field`}
                    style={styles.dateField}
                    onPress={() => setPickerField(field)}
                    accessibilityLabel={field === 'from' ? 'Fecha desde' : 'Fecha hasta'}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#5ee7df" />
                    <Text style={styles.dateText}>{range[field]}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {pickerField && (
              <DateTimePicker
                testID={`${pickerField}-picker`}
                value={parseLocalDate(range[pickerField])}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_, selected) => onPickDate(selected)}
              />
            )}

            {rangeError && <Text style={styles.error}>{rangeError}</Text>}

            <TouchableOpacity
              testID="generate-button"
              style={[styles.generateButton, !canGenerate && styles.generateButtonDisabled]}
              onPress={handleGenerate}
              disabled={!canGenerate}
            >
              {generating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="document-text" size={20} color="#fff" />
                  <Text style={styles.generateButtonText}>Generar PDF</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.hint}>El rango máximo es de 90 días.</Text>
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 24, paddingBottom: 40 },

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
  notice: { color: '#e2e8f0', fontSize: 15, marginTop: 8 },

  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  presetChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  presetChipActive: { borderColor: '#5ee7df', backgroundColor: 'rgba(94,231,223,0.15)' },
  presetText: { color: '#a5d8f3', fontSize: 13, fontWeight: '600' },
  presetTextActive: { color: '#5ee7df' },

  dateRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  dateColumn: { flex: 1 },
  label: { color: '#a5d8f3', fontSize: 13, marginBottom: 6 },
  dateField: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
  },
  dateText: { color: '#fff', fontSize: 15 },

  error: { color: '#ff8a80', fontSize: 13, marginBottom: 8 },

  generateButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 16,
    paddingVertical: 16, marginTop: 12,
  },
  generateButtonDisabled: { opacity: 0.5 },
  generateButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  hint: { color: '#a5d8f3', fontSize: 12, textAlign: 'center', marginTop: 10 },
});
