import { MedicationType } from './Medication';

export type MedicationLogStatus = 'PENDING' | 'CONFIRMED' | 'MISSED' | 'ESCALATED';

export interface MedicationLog {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  instructions: string;
  type: MedicationType;
  scheduledAt: string;
  status: MedicationLogStatus;
}
