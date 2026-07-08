export type PatientContactCategory = 'FAMILY' | 'DOCTOR' | 'EMERGENCY';

export interface PatientContact {
  id: string;
  patientId: string;
  name: string;
  category: PatientContactCategory;
  relationship: string;
  phone: string;
  email: string | null;
  note: string | null;
  priority: boolean;
}
