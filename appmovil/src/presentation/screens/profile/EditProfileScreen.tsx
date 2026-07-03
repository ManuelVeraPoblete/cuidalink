import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { useAuthStore } from '@/presentation/stores/authStore';
import { isValidChileSubscriberNumber, stripChilePrefix, toChilePhone } from '@/domain/utils/chilePhone';
import ScreenBackground from '@/presentation/components/ScreenBackground';

const schema = z.object({
  name: z.string({ error: 'Nombre requerido' }).min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string({ error: 'Correo requerido' }).min(1, 'Correo requerido').email('Correo inválido'),
  phone: z.string().optional().refine(
    (v) => !v || isValidChileSubscriberNumber(v),
    'Ingresa los 9 dígitos del celular, sin el +56'
  ),
  address: z.string().optional(),
  specialty: z.string().optional(),
  experience: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function isAxiosErrorWithStatus(err: unknown, status: number): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { isAxiosError?: unknown }).isAxiosError === true &&
    (err as { response?: { status?: number } }).response?.status === status
  );
}

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'EditProfile'>;
};

export default function EditProfileScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const { authRepo } = useInjection();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ? stripChilePrefix(user.phone) : '',
      address: user?.address ?? '',
      specialty: user?.specialty ?? '',
      experience: user?.experience ?? '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const updated = await authRepo.updateProfile({
        name: data.name,
        email: data.email,
        phone: data.phone ? toChilePhone(data.phone) : null,
        address: data.address || null,
        specialty: data.specialty || null,
        experience: data.experience || null,
      });
      setUser(updated);
      navigation.goBack();
    } catch (err) {
      if (isAxiosErrorWithStatus(err, 409)) {
        Alert.alert('Error', 'Este correo ya está en uso.');
      } else {
        Alert.alert('Error', 'No se pudo actualizar el perfil.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.sheet}>
          <Text style={styles.sectionTitle}>Datos personales</Text>

          <Text style={styles.label}>Nombre completo *</Text>
          <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
            <TextInput style={[styles.input, errors.name && styles.inputError]}
              placeholder="Ej: Manuel Vera" value={value} onChangeText={onChange} />
          )} />
          {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

          <Text style={styles.label}>Correo electrónico *</Text>
          <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
            <TextInput style={[styles.input, errors.email && styles.inputError]}
              placeholder="Ej: manuel.vera@email.com" autoCapitalize="none" keyboardType="email-address"
              value={value} onChangeText={onChange} />
          )} />
          {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

          <Text style={styles.label}>Teléfono</Text>
          <View style={[styles.input, styles.phoneRow, errors.phone && styles.inputError]}>
            <Text style={styles.phonePrefix}>🇨🇱 +56</Text>
            <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
              <TextInput style={styles.phoneInput}
                placeholder="912345678" keyboardType="number-pad" maxLength={9}
                value={value} onChangeText={(text) => onChange(text.replace(/\D/g, ''))} />
            )} />
          </View>
          {errors.phone && <Text style={styles.error}>{errors.phone.message}</Text>}

          <Text style={styles.label}>Dirección</Text>
          <Controller control={control} name="address" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input}
              placeholder="Ej: Av. Providencia 123, Santiago" value={value} onChangeText={onChange} />
          )} />

          <Text style={styles.label}>Especialidad</Text>
          <Controller control={control} name="specialty" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input}
              placeholder="Ej: Cuidado de adultos mayores" value={value} onChangeText={onChange} />
          )} />

          <Text style={styles.label}>Experiencia</Text>
          <Controller control={control} name="experience" render={({ field: { onChange, value } }) => (
            <TextInput style={styles.input}
              placeholder="Ej: 5 años" value={value} onChangeText={onChange} />
          )} />

          <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar Cambios</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 24, paddingBottom: 48 },
  sheet: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2D7DD2', marginTop: 4, marginBottom: 8 },
  label: { fontSize: 14, color: '#444', marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, justifyContent: 'center', minHeight: 48 },
  inputError: { borderColor: '#e53e3e' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', padding: 0, paddingLeft: 12 },
  phonePrefix: { fontSize: 16, color: '#333', marginRight: 8 },
  phoneInput: { flex: 1, fontSize: 16, padding: 12 },
  error: { color: '#e53e3e', fontSize: 12, marginTop: 2 },
  button: { backgroundColor: '#2D7DD2', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 32 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
