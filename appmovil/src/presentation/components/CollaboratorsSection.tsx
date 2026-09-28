import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useInjection } from '@/presentation/hooks/useInjection';
import { Collaborator } from '@/domain/entities';

type Props = { patientId: string; isOwner: boolean };

export default function CollaboratorsSection({ patientId, isOwner }: Props) {
  const { patientRepo } = useInjection();

  const { data: collaborators, isLoading } = useQuery({
    queryKey: ['collaborators', patientId],
    queryFn: () => patientRepo.getCollaborators(patientId),
  });

  const inviteMutation = useMutation({
    mutationFn: () => patientRepo.getInvitationCode(patientId),
    onSuccess: async (code) => {
      await Clipboard.setStringAsync(code);
      Alert.alert('Código copiado', `El código ${code} fue copiado al portapapeles. Válido por 24h.`);
    },
    onError: () => Alert.alert('Error', 'No se pudo generar el código de invitación. Intenta de nuevo.'),
  });

  if (isLoading) return <ActivityIndicator color="#2D7DD2" />;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Colaboradores</Text>
      {collaborators?.map((c: Collaborator) => (
        <Text key={c.id} style={styles.item}>• {c.name} ({c.email})</Text>
      ))}
      {isOwner && (
        <TouchableOpacity style={styles.btn} onPress={() => inviteMutation.mutate()} disabled={inviteMutation.isPending}>
          <Text style={styles.btnText}>Generar código de invitación</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8 },
  title: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 8 },
  item: { fontSize: 14, color: '#e2e8f0', marginBottom: 4 },
  btn: { backgroundColor: '#2D7DD2', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '600' },
});
