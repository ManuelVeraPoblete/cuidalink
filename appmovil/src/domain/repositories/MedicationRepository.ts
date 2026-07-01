import { Medication, MedicationLog } from '@/domain/entities';

export interface MedicationRepository {
  listMedications(patientId: string): Promise<Medication[]>;
  getDailyLogs(patientId: string, date: string): Promise<MedicationLog[]>;
  confirmLog(logId: string): Promise<MedicationLog>;
  missLog(logId: string): Promise<MedicationLog>;
}
