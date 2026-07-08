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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { needsAttention } from '@/domain/utils/patientDisplay';
import ScreenBackground from '@/presentation/components/ScreenBackground';

function toLocalDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const DAY_OPTIONS: { label: string; value: string }[] = [
  { label: 'Lun', value: 'MONDAY' },
  { label: 'Mar', value: 'TUESDAY' },
  { label: 'Mié', value: 'WEDNESDAY' },
  { label: 'Jue', value: 'THURSDAY' },
  { label: 'Vie', value: 'FRIDAY' },
  { label: 'Sáb', value: 'SATURDAY' },
  { label: 'Dom', value: 'SUNDAY' },
];

const PRIORITY_OPTIONS: { value: 'LOW' | 'MEDIUM' | 'HIGH'; label: string; color: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'LOW', label: 'Baja', color: '#1a9c7d', icon: 'arrow-down' },
  { value: 'MEDIUM', label: 'Media', color: '#f5a623', icon: 'remove' },
  { value: 'HIGH', label: 'Alta', color: '#e05555', icon: 'arrow-up' },
];

const schema = z.object({
  name: z.string({ error: 'Nombre requerido' }).min(1, 'Nombre requerido'),
  time: z.string({ error: 'Hora requerida' }).min(1, 'Hora requerida'),
  scheduleType: z.enum(['DAYS_OF_WEEK', 'DATE_RANGE']),
  daysOfWeek: z.array(z.string()),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  instructions: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  reminderActive: z.boolean(),
}).refine((data) => data.scheduleType !== 'DAYS_OF_WEEK' || data.daysOfWeek.length > 0, {
  message: 'Selecciona al menos un día de la semana',
  path: ['daysOfWeek'],
}).refine((data) => data.scheduleType !== 'DATE_RANGE' || !!data.startDate, {
  message: 'Selecciona la fecha de inicio',
  path: ['startDate'],
}).refine((data) => data.scheduleType !== 'DATE_RANGE' || !!data.endDate, {
  message: 'Selecciona la fecha de término',
  path: ['endDate'],
});
type FormData = z.infer<typeof schema>;

type Props = { navigation: NativeStackNavigationProp<PatientStackParams, 'CreateTask'> };

export default function CreateTaskScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const { careTaskRepo, patientRepo, medicationRepo } = useInjection();
  const selectedPatientId = useAuthStore((s) => s.selectedPatientId);
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: patient } = useQuery({
    queryKey: ['patient', selectedPatientId],
    queryFn: () => patientRepo.getPatient(selectedPatientId!),
    enabled: !!selectedPatientId,
  });
  const { data: logs } = useQuery({
    queryKey: ['medication-logs', selectedPatientId, today],
    queryFn: () => medicationRepo.getDailyLogs(selectedPatientId!, today),
    enabled: !!selectedPatientId,
  });
  const attention = needsAttention(logs);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      time: '', scheduleType: 'DAYS_OF_WEEK', daysOfWeek: [], startDate: null, endDate: null,
      instructions: '', priority: 'MEDIUM', reminderActive: true,
    },
  });

  const time = watch('time');
  const scheduleType = watch('scheduleType');
  const daysOfWeek = watch('daysOfWeek');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const priority = watch('priority');
  const reminderActive = watch('reminderActive');

  function toggleDay(day: string) {
    const next = daysOfWeek.includes(day)
      ? daysOfWeek.filter((d) => d !== day)
      : [...daysOfWeek, day];
    setValue('daysOfWeek', next, { shouldValidate: true });
  }

  const onSubmit = async (data: FormData) => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      await careTaskRepo.createTask(selectedPatientId, {
        name: data.name,
        instructions: data.instructions,
        priority: data.priority,
        reminderActive: data.reminderActive,
        time: data.time,
        scheduleType: data.scheduleType,
        daysOfWeek: data.scheduleType === 'DAYS_OF_WEEK' ? data.daysOfWeek : [],
        startDate: data.scheduleType === 'DATE_RANGE' ? data.startDate : null,
        endDate: data.scheduleType === 'DATE_RANGE' ? data.endDate : null,
      });
      await queryClient.invalidateQueries({ queryKey: ['care-task-logs', selectedPatientId] });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la tarea.');
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

        <Text style={styles.title}>Programar tarea</Text>
        <Text style={styles.subtitle}>Define cuándo y cómo debe realizarse</Text>

        {patient && (
          <View style={styles.patientCard}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={30} color="rgba(255,255,255,0.85)" />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patient.fullName}</Text>
              {attention ? (
                <View style={[styles.statusBadge, styles.statusBadgeWarning]}>
                  <Ionicons name="warning" size={14} color="#3d2e00" />
                  <Text style={styles.statusTextWarning}>Requiere atención</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.statusBadgeOk]}>
                  <Ionicons name="shield-checkmark" size={14} color="#fff" />
                  <Text style={styles.statusTextOk}>Estable</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>1. Nombre de la tarea</Text>
          <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input} placeholder="Ej: Tomar presión, Dar almuerzo, Cambiar apósito"
              placeholderTextColor="#7c93ab" value={value} onChangeText={onChange} />
          )} />
          {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

          <Text style={styles.label}>2. Hora</Text>
          <TouchableOpacity style={styles.input} testID="time-trigger" onPress={() => setShowTimePicker(true)}>
            <Ionicons name="time-outline" size={16} color="#5ee7df" />
            <Text style={styles.inputText}>{time || 'Selecciona la hora'}</Text>
          </TouchableOpacity>
          {errors.time && <Text style={styles.error}>{errors.time.message}</Text>}
          {showTimePicker && (
            <DateTimePicker
              testID="time-picker"
              value={time ? new Date(`2000-01-01T${time}:00`) : new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selected) {
                  const hh = String(selected.getHours()).padStart(2, '0');
                  const mm = String(selected.getMinutes()).padStart(2, '0');
                  setValue('time', `${hh}:${mm}`, { shouldValidate: true });
                }
              }}
            />
          )}

          <Text style={styles.label}>3. Tipo de programación</Text>
          <View style={styles.scheduleTypeRow}>
            <TouchableOpacity
              style={[styles.scheduleTypeButton, scheduleType === 'DAYS_OF_WEEK' && styles.scheduleTypeButtonActive]}
              onPress={() => setValue('scheduleType', 'DAYS_OF_WEEK', { shouldValidate: true })}
            >
              <Ionicons name="calendar" size={16} color={scheduleType === 'DAYS_OF_WEEK' ? '#fff' : '#a5d8f3'} />
              <Text style={[styles.scheduleTypeText, scheduleType === 'DAYS_OF_WEEK' && styles.scheduleTypeTextActive]}>
                Días de la semana
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scheduleTypeButton, scheduleType === 'DATE_RANGE' && styles.scheduleTypeButtonActive]}
              onPress={() => setValue('scheduleType', 'DATE_RANGE', { shouldValidate: true })}
            >
              <Ionicons name="calendar" size={16} color={scheduleType === 'DATE_RANGE' ? '#fff' : '#a5d8f3'} />
              <Text style={[styles.scheduleTypeText, scheduleType === 'DATE_RANGE' && styles.scheduleTypeTextActive]}>
                Rango de fechas
              </Text>
            </TouchableOpacity>
          </View>

          {scheduleType === 'DAYS_OF_WEEK' ? (
            <>
              <View style={styles.daysRow}>
                {DAY_OPTIONS.map((day) => {
                  const selected = daysOfWeek.includes(day.value);
                  return (
                    <TouchableOpacity
                      key={day.value}
                      style={[styles.dayChip, selected && styles.dayChipActive]}
                      onPress={() => toggleDay(day.value)}
                    >
                      <Text style={[styles.dayChipText, selected && styles.dayChipTextActive]}>{day.label}</Text>
                      {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.daysOfWeek && <Text style={styles.error}>{errors.daysOfWeek.message}</Text>}
            </>
          ) : (
            <>
              <View style={styles.row}>
                <View style={styles.rowColumn}>
                  <Text style={styles.label}>Fecha de inicio</Text>
                  <TouchableOpacity style={styles.input} testID="start-date-trigger" onPress={() => setShowStartDatePicker(true)}>
                    <Ionicons name="calendar-outline" size={16} color="#5ee7df" />
                    <Text style={styles.inputText}>{startDate || 'Seleccionar fecha'}</Text>
                  </TouchableOpacity>
                  {errors.startDate && <Text style={styles.error}>{errors.startDate.message}</Text>}
                </View>
                <View style={styles.rowColumn}>
                  <Text style={styles.label}>Fecha de término</Text>
                  <TouchableOpacity style={styles.input} testID="end-date-trigger" onPress={() => setShowEndDatePicker(true)}>
                    <Ionicons name="calendar-outline" size={16} color="#5ee7df" />
                    <Text style={styles.inputText}>{endDate || 'Seleccionar fecha'}</Text>
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
                    if (selected) setValue('startDate', toLocalDateString(selected), { shouldValidate: true });
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
                    if (selected) setValue('endDate', toLocalDateString(selected), { shouldValidate: true });
                  }}
                />
              )}
            </>
          )}

          <Text style={styles.label}>4. Instrucciones</Text>
          <Controller control={control} name="instructions" render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Ej: Realizar con cuidado, registrar resultado, avisar si hay molestias"
              placeholderTextColor="#7c93ab"
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={4}
            />
          )} />

          <View style={styles.row}>
            <View style={styles.rowColumn}>
              <Text style={styles.label}>5. Prioridad</Text>
              <View style={styles.priorityRow}>
                {PRIORITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.priorityButton, priority === opt.value && { backgroundColor: opt.color, borderColor: opt.color }]}
                    onPress={() => setValue('priority', opt.value, { shouldValidate: true })}
                  >
                    <Ionicons name={opt.icon} size={14} color={priority === opt.value ? '#fff' : opt.color} />
                    <Text style={[styles.priorityText, priority === opt.value && styles.priorityTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.rowColumn}>
              <Text style={styles.label}>6. Recordatorio activo</Text>
              <View style={styles.reminderRow}>
                <Ionicons name="notifications-outline" size={16} color="#5ee7df" />
                <Text style={styles.reminderText}>Activar recordatorio</Text>
                <Switch
                  testID="reminder-switch"
                  value={reminderActive}
                  onValueChange={(value) => setValue('reminderActive', value, { shouldValidate: true })}
                  trackColor={{ false: 'rgba(255,255,255,0.18)', true: '#1a9c7d' }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSubmit(onSubmit)} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Guardar tarea</Text>
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
  subtitle: { fontSize: 14, color: '#a5d8f3', marginTop: 4, marginBottom: 20 },

  patientCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    padding: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(148,180,204,0.35)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  statusBadgeOk: { backgroundColor: '#1a9c7d' },
  statusTextOk: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  statusBadgeWarning: { backgroundColor: '#e6b800' },
  statusTextWarning: { color: '#3d2e00', fontWeight: 'bold', fontSize: 13 },

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
  inputText: { color: '#fff', fontSize: 15 },
  textarea: { alignItems: 'flex-start', minHeight: 90, paddingTop: 12 },
  error: { color: '#ff8a8a', fontSize: 12, marginTop: 4 },

  row: { flexDirection: 'row', gap: 12 },
  rowColumn: { flex: 1 },

  scheduleTypeRow: { flexDirection: 'row', gap: 12 },
  scheduleTypeButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingVertical: 12,
  },
  scheduleTypeButtonActive: { backgroundColor: '#1a9c7d', borderColor: '#1a9c7d' },
  scheduleTypeText: { color: '#a5d8f3', fontWeight: '600', fontSize: 13 },
  scheduleTypeTextActive: { color: '#fff' },

  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  dayChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  dayChipActive: { backgroundColor: '#1a9c7d', borderColor: '#1a9c7d' },
  dayChipText: { color: '#a5d8f3', fontWeight: '600', fontSize: 13 },
  dayChipTextActive: { color: '#fff' },

  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingVertical: 12,
  },
  priorityText: { color: '#a5d8f3', fontWeight: '600', fontSize: 12 },
  priorityTextActive: { color: '#fff' },

  reminderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48,
  },
  reminderText: { color: '#fff', fontSize: 13, flex: 1 },

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
