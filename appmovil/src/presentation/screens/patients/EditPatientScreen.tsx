import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Modal, FlatList, Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { isValidRut } from '@/domain/utils/rut';
import { isValidChileSubscriberNumber, stripChilePrefix, toChilePhone } from '@/domain/utils/chilePhone';
import ScreenBackground from '@/presentation/components/ScreenBackground';

const GENDER_OPTIONS = [
  { label: 'Masculino', value: 'MALE' },
  { label: 'Femenino', value: 'FEMALE' },
  { label: 'Otro', value: 'OTHER' },
] as const;

const BLOOD_TYPE_OPTIONS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'No sé'];

const schema = z.object({
  fullName:              z.string({ error: 'Nombre requerido' }).min(2, 'El nombre debe tener al menos 2 caracteres'),
  identificationNumber:  z.string({ error: 'RUT requerido' }).min(1, 'RUT requerido').refine(isValidRut, 'El RUT ingresado no es válido'),
  birthDate:             z.string({ error: 'Fecha de nacimiento requerida' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de nacimiento requerida'),
  gender:                z.enum(['MALE', 'FEMALE', 'OTHER'], { error: 'Selecciona el sexo del paciente' }),
  address:               z.string({ error: 'Dirección requerida' }).min(1, 'Dirección requerida'),
  emergencyContactName:  z.string({ error: 'Nombre del contacto de emergencia requerido' }).min(1, 'Nombre del contacto de emergencia requerido'),
  emergencyContactPhone: z.string({ error: 'Teléfono del contacto de emergencia requerido' }).refine(isValidChileSubscriberNumber, 'Ingresa los 9 dígitos del celular, sin el +56'),
  healthInsurance:       z.string({ error: 'Previsión de salud requerida' }).min(1, 'Previsión de salud requerida'),
  bloodType:             z.string({ error: 'Grupo sanguíneo requerido' }).min(1, 'Grupo sanguíneo requerido'),
});
type FormData = z.infer<typeof schema>;

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'EditPatient'>;
  route: RouteProp<PatientStackParams, 'EditPatient'>;
};

function calcAge(dateStr: string): string {
  if (!dateStr) return '';
  const birth = new Date(dateStr);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear() -
    (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
  return isNaN(age) || age < 0 ? '' : `${age} años`;
}

export default function EditPatientScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showBloodModal, setShowBloodModal] = useState(false);
  const { patientRepo } = useInjection();
  const queryClient = useQueryClient();

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientRepo.getPatient(patientId),
  });

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    values: patient ? {
      fullName: patient.fullName,
      identificationNumber: patient.identificationNumber,
      birthDate: patient.birthDate,
      gender: patient.gender,
      address: patient.address,
      emergencyContactName: patient.emergencyContact.name,
      emergencyContactPhone: stripChilePrefix(patient.emergencyContact.phone),
      healthInsurance: patient.healthInsurance,
      bloodType: patient.bloodType,
    } : undefined,
  });

  const birthDate = watch('birthDate');
  const gender = watch('gender');
  const bloodType = watch('bloodType');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await patientRepo.updatePatient(patientId, {
        ...data,
        emergencyContactPhone: toChilePhone(data.emergencyContactPhone),
      });
      await queryClient.invalidateQueries({ queryKey: ['patients'] });
      await queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el paciente.');
    } finally {
      setLoading(false);
    }
  };

  if (!patient) return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#2D7DD2" /></ScreenBackground>;

  return (
    <ScreenBackground>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.sheet}>
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
      <View style={[styles.input, styles.pickerWrapper, errors.gender && styles.inputError]}>
        <Picker
          selectedValue={gender}
          onValueChange={(value) => setValue('gender', value, { shouldValidate: true })}
        >
          <Picker.Item label="Seleccionar sexo" value={undefined} enabled={false} color="#aaa" />
          {GENDER_OPTIONS.map(opt => (
            <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
          ))}
        </Picker>
      </View>
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
      <View style={[styles.input, styles.phoneRow, errors.emergencyContactPhone && styles.inputError]}>
        <Text style={styles.phonePrefix}>🇨🇱 +56</Text>
        <Controller control={control} name="emergencyContactPhone" render={({ field: { onChange, value } }) => (
          <TextInput style={styles.phoneInput}
            placeholder="912345678" keyboardType="number-pad" maxLength={9}
            value={value} onChangeText={(text) => onChange(text.replace(/\D/g, ''))} />
        )} />
      </View>
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
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar Cambios</Text>}
      </TouchableOpacity>
      </View>

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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 24, paddingBottom: 48 },
  sheet: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2D7DD2', marginTop: 24, marginBottom: 8 },
  label: { fontSize: 14, color: '#444', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, justifyContent: 'center', minHeight: 48 },
  inputError: { borderColor: '#e53e3e' },
  pickerWrapper: { padding: 0, justifyContent: 'center' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', padding: 0, paddingLeft: 12 },
  phonePrefix: { fontSize: 16, color: '#333', marginRight: 8 },
  phoneInput: { flex: 1, fontSize: 16, padding: 12 },
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
