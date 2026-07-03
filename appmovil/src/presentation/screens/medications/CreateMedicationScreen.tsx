import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Switch, Image, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import ScreenBackground from '@/presentation/components/ScreenBackground';

function toLocalDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const schema = z.object({
  name: z.string({ error: 'Nombre requerido' }).min(1, 'Nombre requerido'),
  dosage: z.string({ error: 'Dosis requerida' }).min(1, 'Dosis requerida'),
  startTime: z.string({ error: 'Hora de inicio requerida' }).min(1, 'Hora de inicio requerida'),
  frequencyHours: z.number().min(1).max(24),
  startDate: z.string({ error: 'Fecha de inicio requerida' }).min(1, 'Fecha de inicio requerida'),
  endDate: z.string().nullable(),
  indefinite: z.boolean(),
  instructions: z.string(),
}).refine((data) => data.indefinite || !!data.endDate, {
  message: 'Selecciona la fecha de término o activa Indefinido',
  path: ['endDate'],
});
type FormData = z.infer<typeof schema>;

type Props = { navigation: NativeStackNavigationProp<PatientStackParams, 'CreateMedication'> };

export default function CreateMedicationScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const { medicationRepo } = useInjection();
  const selectedPatientId = useAuthStore((s) => s.selectedPatientId);
  const queryClient = useQueryClient();

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      startTime: '', frequencyHours: 8, startDate: '', endDate: null,
      indefinite: true, instructions: '',
    },
  });

  const startTime = watch('startTime');
  const frequencyHours = watch('frequencyHours');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const indefinite = watch('indefinite');

  const onSubmit = async (data: FormData) => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      await medicationRepo.createMedication(selectedPatientId, {
        name: data.name,
        dosage: data.dosage,
        instructions: data.instructions,
        startTime: data.startTime,
        frequencyHours: data.frequencyHours,
        startDate: data.startDate,
        endDate: data.indefinite ? null : data.endDate,
      });
      await queryClient.invalidateQueries({ queryKey: ['medications', selectedPatientId] });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo crear el medicamento.');
    } finally {
      setLoading(false);
    }
  };

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

        <Text style={styles.title}>Nuevo medicamento</Text>
        <Text style={styles.subtitle}>Configura dosis, horario y duración del tratamiento</Text>

        <View style={styles.card}>
          <Text style={styles.label}>1. Nombre del medicamento</Text>
          <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input} placeholder="Ingresa el nombre del medicamento"
              placeholderTextColor="#7c93ab" value={value} onChangeText={onChange} />
          )} />
          {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

          <Text style={styles.label}>2. Dosis</Text>
          <Controller control={control} name="dosage" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input} placeholder="Ej: 1 tableta / 10 ml"
              placeholderTextColor="#7c93ab" value={value} onChangeText={onChange} />
          )} />
          {errors.dosage && <Text style={styles.error}>{errors.dosage.message}</Text>}

          <View style={styles.row}>
            <View style={styles.rowColumn}>
              <Text style={styles.label}>3. Hora de inicio</Text>
              <TouchableOpacity style={styles.input} testID="start-time-trigger" onPress={() => setShowTimePicker(true)}>
                <Ionicons name="time-outline" size={16} color="#5ee7df" />
                <Text style={styles.inputText}>{startTime || 'Selecciona la hora'}</Text>
              </TouchableOpacity>
              {errors.startTime && <Text style={styles.error}>{errors.startTime.message}</Text>}
            </View>
            <View style={styles.rowColumn}>
              <Text style={styles.label}>4. Frecuencia (en horas)</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setValue('frequencyHours', Math.max(1, frequencyHours - 1), { shouldValidate: true })}
                >
                  <Text style={styles.stepperButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{frequencyHours}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setValue('frequencyHours', Math.min(24, frequencyHours + 1), { shouldValidate: true })}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          {showTimePicker && (
            <DateTimePicker
              testID="start-time-picker"
              value={startTime ? new Date(`2000-01-01T${startTime}:00`) : new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selected) {
                  const hh = String(selected.getHours()).padStart(2, '0');
                  const mm = String(selected.getMinutes()).padStart(2, '0');
                  setValue('startTime', `${hh}:${mm}`, { shouldValidate: true });
                }
              }}
            />
          )}

          <View style={styles.row}>
            <View style={styles.rowColumn}>
              <Text style={styles.label}>5. Fecha de inicio</Text>
              <TouchableOpacity style={styles.input} testID="start-date-trigger" onPress={() => setShowStartDatePicker(true)}>
                <Ionicons name="calendar-outline" size={16} color="#5ee7df" />
                <Text style={styles.inputText}>{startDate || 'Selecciona la fecha'}</Text>
              </TouchableOpacity>
              {errors.startDate && <Text style={styles.error}>{errors.startDate.message}</Text>}
            </View>
            <View style={styles.rowColumn}>
              <Text style={styles.label}>6. Fecha de término</Text>
              <TouchableOpacity
                style={[styles.input, indefinite && styles.inputDisabled]}
                testID="end-date-trigger"
                disabled={indefinite}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={16} color={indefinite ? '#5b7186' : '#5ee7df'} />
                <Text style={[styles.inputText, indefinite && styles.inputTextDisabled]}>
                  {endDate || 'Selecciona la fecha'}
                </Text>
              </TouchableOpacity>
              {errors.endDate && <Text style={styles.error}>{errors.endDate.message}</Text>}
            </View>
          </View>
          {showStartDatePicker && (
            <DateTimePicker
              testID="start-date-picker"
              value={startDate ? new Date(startDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                setShowStartDatePicker(Platform.OS === 'ios');
                if (selected) {
                  setValue('startDate', toLocalDateString(selected), { shouldValidate: true });
                }
              }}
            />
          )}
          {showEndDatePicker && (
            <DateTimePicker
              testID="end-date-picker"
              value={endDate ? new Date(endDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                setShowEndDatePicker(Platform.OS === 'ios');
                if (selected) {
                  setValue('endDate', toLocalDateString(selected), { shouldValidate: true });
                }
              }}
            />
          )}

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>7. Indefinido</Text>
              <Text style={styles.helpText}>La fecha de inicio es obligatoria.</Text>
            </View>
            <Switch
              testID="indefinite-switch"
              value={indefinite}
              onValueChange={(value) => {
                setValue('indefinite', value, { shouldValidate: true });
                if (value) setValue('endDate', null, { shouldValidate: true });
              }}
              trackColor={{ false: 'rgba(255,255,255,0.18)', true: '#e05555' }}
              thumbColor="#fff"
            />
          </View>

          <Text style={styles.label}>8. Condiciones de administración</Text>
          <Controller control={control} name="instructions" render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Ej: Después de comer, En ayunas, Con abundante agua, etc."
              placeholderTextColor="#7c93ab"
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={4}
            />
          )} />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSubmit(onSubmit)} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Guardar medicamento</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
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
  subtitle: { fontSize: 14, color: '#a5d8f3', marginTop: 4, marginBottom: 20 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 20,
    marginBottom: 24,
  },
  label: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 8, marginTop: 16 },
  input: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 48,
  },
  inputDisabled: { opacity: 0.5 },
  inputText: { color: '#fff', fontSize: 15 },
  inputTextDisabled: { color: '#7c93ab' },
  textarea: { alignItems: 'flex-start', minHeight: 90, paddingTop: 12 },
  error: { color: '#ff8a8a', fontSize: 12, marginTop: 4 },

  row: { flexDirection: 'row', gap: 12 },
  rowColumn: { flex: 1 },

  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingHorizontal: 8, minHeight: 48,
  },
  stepperButton: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperButtonText: { color: '#5ee7df', fontSize: 20, fontWeight: 'bold' },
  stepperValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, marginBottom: 4,
  },
  helpText: { color: '#a5d8f3', fontSize: 12, marginTop: 2 },

  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#e05555', borderRadius: 16,
    paddingVertical: 16, marginBottom: 12,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  cancelButton: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#5ee7df', borderRadius: 16,
    paddingVertical: 14,
  },
  cancelButtonText: { color: '#5ee7df', fontWeight: 'bold', fontSize: 16 },
});
