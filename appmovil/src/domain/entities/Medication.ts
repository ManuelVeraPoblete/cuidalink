export type MedicationType = 'TABLET' | 'CAPSULE' | 'INJECTION' | 'OTHER';

export interface MedicationSchedule {
  times: string[];
  frequency: 'DAILY' | 'EVERY_X_DAYS' | 'WEEKLY';
  daysOfWeek: string[];
  startDate: string;
  endDate: string | null;
  intervalDays: number | null;
  startTime: string | null;
  frequencyHours: number | null;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  instructions: string;
  type: MedicationType;
  schedule: MedicationSchedule;
  active: boolean;
}
