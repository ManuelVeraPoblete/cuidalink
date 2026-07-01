import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

type Props = {
  onGenerate: (from: string, to: string) => void;
  loading: boolean;
};

export default function DateRangePicker({ onGenerate, loading }: Props) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const isValid = dateRegex.test(from) && dateRegex.test(to);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Desde (YYYY-MM-DD)"
        value={from}
        onChangeText={setFrom}
      />
      <TextInput
        style={styles.input}
        placeholder="Hasta (YYYY-MM-DD)"
        value={to}
        onChangeText={setTo}
      />
      <TouchableOpacity
        style={[styles.btn, !isValid && styles.btnDisabled]}
        onPress={() => onGenerate(from, to)}
        disabled={!isValid || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Descargar PDF</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 15 },
  btn: { backgroundColor: '#2D7DD2', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#aaa' },
  btnText: { color: '#fff', fontWeight: '600' },
});
