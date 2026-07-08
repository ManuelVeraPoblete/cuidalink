import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Switch, Image } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { PatientStackParams } from '@/presentation/navigation/AppNavigator';
import { useInjection } from '@/presentation/hooks/useInjection';
import { pickContactCategoryStyle } from '@/domain/utils/contactDisplay';
import { isValidChileSubscriberNumber, stripChilePrefix, toChilePhone } from '@/domain/utils/chilePhone';
import { PatientContactCategory } from '@/domain/entities';
import ScreenBackground from '@/presentation/components/ScreenBackground';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParams, 'ContactForm'>;
  route: RouteProp<PatientStackParams, 'ContactForm'>;
};

const CATEGORY_OPTIONS: PatientContactCategory[] = ['FAMILY', 'DOCTOR', 'EMERGENCY'];

const schema = z.object({
  name: z.string({ error: 'Nombre requerido' }).min(1, 'Nombre requerido'),
  category: z.enum(['FAMILY', 'DOCTOR', 'EMERGENCY'], { error: 'Selecciona una categoría' }),
  relationship: z.string(),
  phone: z.string({ error: 'Teléfono requerido' }).refine(isValidChileSubscriberNumber, 'Ingresa los 9 dígitos del celular, sin el +56'),
  email: z.string().refine((v) => v === '' || z.string().email().safeParse(v).success, 'Email inválido'),
  note: z.string(),
  priority: z.boolean(),
});
type FormData = z.infer<typeof schema>;

export default function ContactFormScreen({ navigation, route }: Props) {
  const { patientId, contactId } = route.params;
  const isEditing = !!contactId;
  const [loading, setLoading] = useState(false);
  const { patientContactRepo } = useInjection();
  const queryClient = useQueryClient();

  const { data: contacts } = useQuery({
    queryKey: ['patient-contacts', patientId],
    queryFn: () => patientContactRepo.listContacts(patientId),
    enabled: isEditing,
  });
  const existing = contacts?.find((c) => c.id === contactId);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    values: isEditing && existing ? {
      name: existing.name,
      category: existing.category,
      relationship: existing.relationship,
      phone: stripChilePrefix(existing.phone),
      email: existing.email ?? '',
      note: existing.note ?? '',
      priority: existing.priority,
    } : {
      name: '', category: 'FAMILY', relationship: '', phone: '', email: '', note: '', priority: false,
    },
  });

  const category = watch('category');
  const priority = watch('priority');

  if (isEditing && !existing) {
    return <ScreenBackground><ActivityIndicator style={{ flex: 1 }} size="large" color="#fff" /></ScreenBackground>;
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        name: data.name,
        category: data.category,
        relationship: data.relationship,
        phone: toChilePhone(data.phone),
        email: data.email || null,
        note: data.note || null,
        priority: data.priority,
      };
      if (isEditing) {
        await patientContactRepo.updateContact(patientId, contactId!, payload);
      } else {
        await patientContactRepo.createContact(patientId, payload);
      }
      await queryClient.invalidateQueries({ queryKey: ['patient-contacts', patientId] });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el contacto.');
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

        <Text style={styles.title}>{isEditing ? 'Editar contacto' : 'Nuevo contacto'}</Text>
        <Text style={styles.subtitle}>Datos del contacto vinculado al paciente</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nombre</Text>
          <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
            <TextInput testID="contact-name-input" style={styles.input} placeholder="Ej: Ana Martínez"
              placeholderTextColor="#7c93ab" value={value} onChangeText={onChange} />
          )} />
          {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

          <Text style={styles.label}>Categoría</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((opt) => {
              const style = pickContactCategoryStyle(opt);
              const selected = category === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.categoryButton, selected && { backgroundColor: style.color, borderColor: style.color }]}
                  onPress={() => setValue('category', opt, { shouldValidate: true })}
                >
                  <Ionicons name={style.icon} size={14} color={selected ? '#fff' : style.color} />
                  <Text style={[styles.categoryButtonText, selected && styles.categoryButtonTextActive]}>{style.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Relación</Text>
          <Controller control={control} name="relationship" render={({ field: { onChange, value } }) => (
            <TextInput testID="contact-relationship-input" style={styles.input} placeholder="Ej: Hija, Médico tratante, Hermano"
              placeholderTextColor="#7c93ab" value={value} onChangeText={onChange} />
          )} />

          <Text style={styles.label}>Teléfono</Text>
          <View style={[styles.input, styles.phoneRow]}>
            <Text style={styles.phonePrefix}>🇨🇱 +56</Text>
            <Controller control={control} name="phone" render={({ field: { onChange, value } }) => (
              <TextInput testID="contact-phone-input" style={styles.phoneInput} placeholder="912345678"
                keyboardType="number-pad" maxLength={9} placeholderTextColor="#7c93ab"
                value={value} onChangeText={(text) => onChange(text.replace(/\D/g, ''))} />
            )} />
          </View>
          {errors.phone && <Text style={styles.error}>{errors.phone.message}</Text>}

          <Text style={styles.label}>Email</Text>
          <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
            <TextInput testID="contact-email-input" style={styles.input} placeholder="Ej: ana@email.com"
              keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#7c93ab"
              value={value} onChangeText={onChange} />
          )} />
          {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

          <Text style={styles.label}>Nota</Text>
          <Controller control={control} name="note" render={({ field: { onChange, value } }) => (
            <TextInput testID="contact-note-input" style={[styles.input, styles.textarea]}
              placeholder="Ej: Llamar primero en caso de urgencia" placeholderTextColor="#7c93ab"
              value={value} onChangeText={onChange} multiline numberOfLines={3} />
          )} />

          <View style={styles.priorityRow}>
            <Ionicons name="star-outline" size={16} color="#5ee7df" />
            <Text style={styles.priorityLabel}>Marcar como prioritario</Text>
            <Switch
              testID="contact-priority-switch"
              value={priority}
              onValueChange={(value) => setValue('priority', value, { shouldValidate: true })}
              trackColor={{ false: 'rgba(255,255,255,0.18)', true: '#e05555' }}
              thumbColor="#fff"
            />
          </View>
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
  label: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 48, color: '#fff', fontSize: 15,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  error: { color: '#ff8a8a', fontSize: 12, marginTop: 4 },

  phoneRow: { flexDirection: 'row', alignItems: 'center' },
  phonePrefix: { color: '#fff', fontSize: 15, marginRight: 8 },
  phoneInput: { flex: 1, color: '#fff', fontSize: 15 },

  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingVertical: 12,
  },
  categoryButtonText: { color: '#a5d8f3', fontWeight: '600', fontSize: 12 },
  categoryButtonTextActive: { color: '#fff' },

  priorityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, marginTop: 16,
  },
  priorityLabel: { color: '#fff', fontSize: 13, flex: 1 },

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
