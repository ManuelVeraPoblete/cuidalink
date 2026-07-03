import { Medication, MedicationLog } from '@/domain/entities';

export interface CreateMedicationData {
  name: string;
  dosage: string;
  instructions: string;
  startTime: string;
  frequencyHours: number;
  startDate: string;
  endDate: string | null;
}

export interface MedicationRepository {
  listMedications(patientId: string): Promise<Medication[]>;
  createMedication(patientId: string, data: CreateMedicationData): Promise<Medication>;
  getDailyLogs(patientId: string, date: string): Promise<MedicationLog[]>;
  confirmLog(logId: string): Promise<MedicationLog>;
  missLog(logId: string): Promise<MedicationLog>;
}
