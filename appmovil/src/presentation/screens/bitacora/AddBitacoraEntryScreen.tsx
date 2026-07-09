import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'AddBitacoraEntry'>;
  route: RouteProp<PatientStackParams, 'AddBitacoraEntry'>;
};

const schema = z.object({
  note: z.string({ error: 'La nota es obligatoria' }).min(1, 'La nota es obligatoria'),
});
type FormData = z.infer<typeof schema>;

export default function AddBitacoraEntryScreen({ navigation, route }: Props) {
  const { patientId } = route.params;
  const [loading, setLoading] = useState(false);
  const { bitacoraEntryRepo } = useInjection();
  const queryClient = useQueryClient();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { note: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await bitacoraEntryRepo.createEntry(patientId, data.note);
      await queryClient.invalidateQueries({ queryKey: ['bitacora-entries', patientId] });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la entrada.');
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
            <Image source={require('../../../../assets/cuidalink-icon.png')} style={styles.headerLogoIcon} resizeMode="contain" />
            <Text style={styles.headerTitle}>
              <Text style={styles.headerCuida}>Cuida</Text>
              <Text style={styles.headerLink}>Link</Text>
            </Text>
          </View>
          <View style={styles.backButtonSpacer} />
        </View>

        <Text style={styles.title}>Nueva entrada</Text>
        <Text style={styles.subtitle}>Agrega una nota a la bitácora del paciente</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nota</Text>
          <Controller control={control} name="note" render={({ field: { onChange, value } }) => (
            <TextInput
              testID="bitacora-note-input"
              style={[styles.input, styles.textarea]}
              placeholder="Ej: Paciente durmió bien durante la noche"
              placeholderTextColor="#7c93ab"
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={5}
            />
          )} />
          {errors.note && <Text style={styles.error}>{errors.note.message}</Text>}
        </View>

        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSubmit(onSubmit)} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Guardar</Text>}
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

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 20,
    marginBottom: 24,
  },
  label: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 48, color: '#fff', fontSize: 15,
  },
  textarea: { minHeight: 120, textAlignVertical: 'top', paddingTop: 12 },
  error: { color: '#ff8a8a', fontSize: 12, marginTop: 4 },

  footerRow: { flexDirection: 'row', gap: 12 },
  saveButton: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#e05555', borderRadius: 16, paddingVertical: 16,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelButton: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#5ee7df', borderRadius: 16, paddingVertical: 14,
  },
  cancelButtonText: { color: '#5ee7df', fontWeight: 'bold', fontSize: 16 },
});
