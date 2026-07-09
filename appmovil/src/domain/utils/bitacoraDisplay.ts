import type { Ionicons } from '@expo/vector-icons';
import { BitacoraEntryType } from '@/domain/entities';

export function pickBitacoraEntryStyle(type: BitacoraEntryType):
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string } {
  switch (type) {
    case 'ENTRY':
      return { icon: 'create-outline', color: '#1a9c7d', label: 'Entrada' };
    case 'OBSERVATION':
      return { icon: 'eye-outline', color: '#7c5cfc', label: 'Observación' };
  }
}
