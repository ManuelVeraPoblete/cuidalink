import type { Ionicons } from '@expo/vector-icons';
import { PatientContactCategory } from '@/domain/entities';

export function pickContactCategoryStyle(category: PatientContactCategory):
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string } {
  switch (category) {
    case 'FAMILY':
      return { icon: 'people', color: '#1a9c7d', label: 'Familia' };
    case 'DOCTOR':
      return { icon: 'medkit', color: '#2f6fed', label: 'Médico' };
    case 'EMERGENCY':
      return { icon: 'alarm', color: '#e05555', label: 'Emergencia' };
  }
}
