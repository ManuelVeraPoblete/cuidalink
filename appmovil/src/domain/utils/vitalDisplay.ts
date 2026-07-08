import type { Ionicons } from '@expo/vector-icons';

export function pickVitalIcon(name: string): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  const n = name.toLowerCase();
  if (/temperatura/.test(n))
    return { icon: 'thermometer-outline', color: '#f5a623' };
  if (/presión|presion/.test(n))
    return { icon: 'pulse', color: '#e74c3c' };
  if (/pulso/.test(n))
    return { icon: 'heart', color: '#e05555' };
  if (/frecuencia respiratoria|respirator/.test(n))
    return { icon: 'body-outline', color: '#2f6fed' };
  if (/saturaci|oxígeno|oxigeno|spo2/.test(n))
    return { icon: 'water-outline', color: '#2f6fed' };
  if (/dolor/.test(n))
    return { icon: 'sad-outline', color: '#f5a623' };
  if (/glucosa|glicemia/.test(n))
    return { icon: 'cube-outline', color: '#16a085' };
  if (/observ/.test(n))
    return { icon: 'chatbubble-ellipses-outline', color: '#5ee7df' };
  return { icon: 'pulse-outline', color: '#7c5cfc' };
}
