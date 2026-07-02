export type MedicationType = 'TABLET' | 'CAPSULE' | 'INJECTION' | 'OTHER';

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  scheduledTimes: string[];
  type: MedicationType;
  active: boolean;
}
