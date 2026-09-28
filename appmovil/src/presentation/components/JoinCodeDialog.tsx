import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
};

const CODE_PATTERN = /^[A-Z0-9]{8}$/;

export default function JoinCodeDialog({ visible, onClose, onJoin }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleJoin = () => {
    const normalized = code.trim().toUpperCase();
    if (!CODE_PATTERN.test(normalized)) {
      setError('El código debe tener 8 letras o números.');
      return;
    }
    setCode('');
    setError(null);
    onJoin(normalized);
  };

  const handleClose = () => {
    setCode('');
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Unirse con código</Text>
          <Text style={styles.description}>
            Ingresa el código que te compartió el cuidador principal. Es válido por 24 horas.
          </Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="Código de 8 caracteres"
            placeholderTextColor="rgba(165,216,243,0.6)"
            value={code}
            onChangeText={(text) => { setCode(text); setError(null); }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            accessibilityLabel="Código de invitación"
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.joinBtn} onPress={handleJoin}>
              <Text style={styles.joinText}>Unirse</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dialog: {
    backgroundColor: '#12283f', borderRadius: 16, padding: 24, width: '85%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#fff' },
  description: { fontSize: 14, color: '#a5d8f3', marginBottom: 16 },
  input: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff',
    padding: 12, fontSize: 18, letterSpacing: 4, textAlign: 'center', marginBottom: 8,
  },
  inputError: { borderColor: '#ff8a80' },
  error: { color: '#ff8a80', fontSize: 13, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: {
    flex: 1, padding: 12, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelText: { color: '#e2e8f0' },
  joinBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#2D7DD2' },
  joinText: { color: '#fff', fontWeight: 'bold' },
});
