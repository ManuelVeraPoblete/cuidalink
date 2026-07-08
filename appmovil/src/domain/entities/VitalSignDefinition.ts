export interface VitalSignDefinition {
  id: string;
  patientId: string;
  name: string;
  unit: string;
  normalRangeMin?: number;
  normalRangeMax?: number;
}
