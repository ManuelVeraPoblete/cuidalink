import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInjection } from '@/presentation/hooks/useInjection';
import { Collaborator } from '@/domain/entities';
import JoinCodeDialog from './JoinCodeDialog';
import { useState } from 'react';

type Props = { patientId: string; isOwner: boolean };

export default function CollaboratorsSection({ patientId, isOwner }: Props) {
  const { patientRepo } = useInjection();
  const queryClient = useQueryClient();
  const [joinVisible, setJoinVisible] = useState(false);

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
  });

  const joinMutation = useMutation({
    mutationFn: (code: string) => patientRepo.joinPatient(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      Alert.alert('Éxito', 'Te uniste como colaborador.');
    },
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
      <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => setJoinVisible(true)}>
        <Text style={styles.btnOutlineText}>Unirme con código</Text>
      </TouchableOpacity>
      <JoinCodeDialog visible={joinVisible} onClose={() => setJoinVisible(false)} onJoin={(code) => joinMutation.mutate(code)} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8 },
  title: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 8 },
  item: { fontSize: 14, color: '#e2e8f0', marginBottom: 4 },
  btn: { backgroundColor: '#2D7DD2', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '600' },
  btnOutline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2D7DD2' },
  btnOutlineText: { color: '#2D7DD2', fontWeight: '600' },
});
