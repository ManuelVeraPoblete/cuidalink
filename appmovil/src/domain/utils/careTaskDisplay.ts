import { Ionicons } from '@expo/vector-icons';

export function pickTaskIcon(name: string): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  const n = name.toLowerCase();
  if (/(presión|presion|glicemia|glucosa|temperatura|signos)/.test(n))
    return { icon: 'clipboard', color: '#2f6fed' };
  if (/(desayuno|almuerzo|cena|comida|alimentaci)/.test(n))
    return { icon: 'restaurant', color: '#f5a623' };
  if (/(apósito|aposito|curaci|herida|venda)/.test(n))
    return { icon: 'bandage', color: '#e74c3c' };
  if (/(ejercicio|movilidad|caminar|terapia)/.test(n))
    return { icon: 'walk', color: '#16a085' };
  return { icon: 'checkbox', color: '#7c5cfc' };
}
