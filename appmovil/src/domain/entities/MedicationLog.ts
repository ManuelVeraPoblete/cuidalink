export type MedicationLogStatus = 'PENDING' | 'CONFIRMED' | 'MISSED' | 'ESCALATED';

export interface MedicationLog {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  scheduledAt: string;
  status: MedicationLogStatus;
}
