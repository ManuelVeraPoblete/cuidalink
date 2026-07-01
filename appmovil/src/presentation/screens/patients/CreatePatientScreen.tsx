import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Modal, FlatList, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';

const GENDER_OPTIONS = [
  { label: 'Masculino', value: 'MALE' },
  { label: 'Femenino', value: 'FEMALE' },
  { label: 'Otro', value: 'OTHER' },
] as const;

const BLOOD_TYPE_OPTIONS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'No sé'];

const schema = z.object({
  fullName:              z.string().min(2, 'Nombre requerido'),
  identificationNumber:  z.string().min(1, 'RUT requerido'),
  birthDate:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha requerida'),
  gender:                z.enum(['MALE', 'FEMALE', 'OTHER']),
  address:               z.string().min(1, 'Dirección requerida'),
  emergencyContactName:  z.string().min(1, 'Nombre contacto requerido'),
  emergencyContactPhone: z.string().min(1, 'Teléfono requerido'),
  healthInsurance:       z.string().min(1, 'Previsión requerida'),
  bloodType:             z.string().min(1, 'Grupo sanguíneo requerido'),
});
type FormData = z.infer<typeof schema>;

type Props = { navigation: NativeStackNavigationProp<PatientStackParams, 'CreatePatient'> };

function calcAge(dateStr: string): string {
  if (!dateStr) return '';
  const birth = new Date(dateStr);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear() -
    (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
  return isNaN(age) || age < 0 ? '' : `${age} años`;
}

export default function CreatePatientScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showBloodModal, setShowBloodModal] = useState(false);
  const { patientRepo } = useInjection();
  const queryClient = useQueryClient();

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { birthDate: '', bloodType: '' },
  });

  const birthDate = watch('birthDate');
  const gender = watch('gender');
  const bloodType = watch('bloodType');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await patientRepo.createPatient(data);
      await queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo crear el paciente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Datos personales</Text>

      <Text style={styles.label}>Nombre completo *</Text>
      <Controller control={control} name="fullName" render={({ field: { onChange, value } }) => (
        <TextInput style={[styles.input, errors.fullName && styles.inputError]}
          placeholder="Ej: María González López" value={value} onChangeText={onChange} />
      )} />
      {errors.fullName && <Text style={styles.error}>{errors.fullName.message}</Text>}

      <Text style={styles.label}>RUT / Documento de identidad *</Text>
      <Controller control={control} name="identificationNumber" render={({ field: { onChange, value } }) => (
        <TextInput style={[styles.input, errors.identificationNumber && styles.inputError]}
          placeholder="Ej: 12.345.678-9" value={value} onChangeText={onChange} />
      )} />
      {errors.identificationNumber && <Text style={styles.error}>{errors.identificationNumber.message}</Text>}

      <Text style={styles.label}>Fecha de nacimiento *</Text>
      <TouchableOpacity style={[styles.input, errors.birthDate && styles.inputError]}
        onPress={() => setShowDatePicker(true)}>
        <Text style={{ color: birthDate ? '#000' : '#aaa', fontSize: 16 }}>
          {birthDate || 'Seleccionar fecha'}
        </Text>
      </TouchableOpacity>
      {errors.birthDate && <Text style={styles.error}>{errors.birthDate.message}</Text>}
      {showDatePicker && (
        <DateTimePicker
          value={birthDate ? new Date(birthDate) : new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_, selected) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selected) {
              const iso = selected.toISOString().split('T')[0];
              setValue('birthDate', iso, { shouldValidate: true });
            }
          }}
        />
      )}

      {birthDate ? (
        <View style={styles.ageRow}>
          <Text style={styles.ageLabel}>Edad calculada:</Text>
          <Text style={styles.ageValue}>{calcAge(birthDate)}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Sexo *</Text>
      <TouchableOpacity style={[styles.input, errors.gender && styles.inputError]}
        onPress={() => setShowGenderModal(true)}>
        <Text style={{ color: gender ? '#000' : '#aaa', fontSize: 16 }}>
          {GENDER_OPTIONS.find(o => o.value === gender)?.label || 'Seleccionar sexo'}
        </Text>
      </TouchableOpacity>
      {errors.gender && <Text style={styles.error}>{errors.gender.message}</Text>}

      <Text style={styles.label}>Dirección *</Text>
      <Controller control={control} name="address" render={({ field: { onChange, value } }) => (
        <TextInput style={[styles.input, errors.address && styles.inputError]}
          placeholder="Ej: Av. Providencia 123, Santiago" value={value} onChangeText={onChange} />
      )} />
      {errors.address && <Text style={styles.error}>{errors.address.message}</Text>}

      <Text style={styles.sectionTitle}>Contacto de emergencia</Text>

      <Text style={styles.label}>Nombre *</Text>
      <Controller control={control} name="emergencyContactName" render={({ field: { onChange, value } }) => (
        <TextInput style={[styles.input, errors.emergencyContactName && styles.inputError]}
          placeholder="Ej: Juan González" value={value} onChangeText={onChange} />
      )} />
      {errors.emergencyContactName && <Text style={styles.error}>{errors.emergencyContactName.message}</Text>}

      <Text style={styles.label}>Teléfono *</Text>
      <Controller control={control} name="emergencyContactPhone" render={({ field: { onChange, value } }) => (
        <TextInput style={[styles.input, errors.emergencyContactPhone && styles.inputError]}
          placeholder="+56912345678" keyboardType="phone-pad" value={value} onChangeText={onChange} />
      )} />
      {errors.emergencyContactPhone && <Text style={styles.error}>{errors.emergencyContactPhone.message}</Text>}

      <Text style={styles.sectionTitle}>Información médica</Text>

      <Text style={styles.label}>Previsión de salud *</Text>
      <Controller control={control} name="healthInsurance" render={({ field: { onChange, value } }) => (
        <TextInput style={[styles.input, errors.healthInsurance && styles.inputError]}
          placeholder="Ej: Fonasa, Isapre Cruz Blanca" value={value} onChangeText={onChange} />
      )} />
      {errors.healthInsurance && <Text style={styles.error}>{errors.healthInsurance.message}</Text>}

      <Text style={styles.label}>Grupo sanguíneo *</Text>
      <TouchableOpacity style={[styles.input, errors.bloodType && styles.inputError]}
        onPress={() => setShowBloodModal(true)}>
        <Text style={{ color: bloodType ? '#000' : '#aaa', fontSize: 16 }}>
          {bloodType || 'Seleccionar grupo'}
        </Text>
      </TouchableOpacity>
      {errors.bloodType && <Text style={styles.error}>{errors.bloodType.message}</Text>}

      <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear Paciente</Text>}
      </TouchableOpacity>

      <Modal visible={showGenderModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Seleccionar sexo</Text>
            {GENDER_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={styles.modalItem}
                onPress={() => { setValue('gender', opt.value, { shouldValidate: true }); setShowGenderModal(false); }}>
                <Text style={styles.modalItemText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowGenderModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showBloodModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Grupo sanguíneo</Text>
            <FlatList
              data={BLOOD_TYPE_OPTIONS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem}
                  onPress={() => { setValue('bloodType', item, { shouldValidate: true }); setShowBloodModal(false); }}>
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setShowBloodModal(false)}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2D7DD2', marginTop: 24, marginBottom: 8 },
  label: { fontSize: 14, color: '#444', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, justifyContent: 'center', minHeight: 48 },
  inputError: { borderColor: '#e53e3e' },
  error: { color: '#e53e3e', fontSize: 12, marginTop: 2 },
  ageRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  ageLabel: { fontSize: 14, color: '#666', marginRight: 8 },
  ageValue: { fontSize: 14, fontWeight: '600', color: '#2D7DD2' },
  button: { backgroundColor: '#2D7DD2', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 32 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16, color: '#333' },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalCancel: { textAlign: 'center', color: '#e53e3e', fontSize: 16, marginTop: 16 },
});
