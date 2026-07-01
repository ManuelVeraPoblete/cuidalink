export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  scheduledTimes: string[];
  active: boolean;
}
