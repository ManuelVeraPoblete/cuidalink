import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
};

export default function JoinCodeDialog({ visible, onClose, onJoin }: Props) {
  const [code, setCode] = useState('');

  const handleJoin = () => {
    if (code.trim().length === 8) {
      onJoin(code.trim().toUpperCase());
      setCode('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Unirse con código</Text>
          <TextInput
            style={styles.input}
            placeholder="Código de 8 caracteres"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            maxLength={8}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
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
  dialog: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '80%' },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1a1a2e' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 18, letterSpacing: 4, textAlign: 'center', marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  cancelText: { color: '#555' },
  joinBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: '#2D7DD2' },
  joinText: { color: '#fff', fontWeight: '600' },
});
