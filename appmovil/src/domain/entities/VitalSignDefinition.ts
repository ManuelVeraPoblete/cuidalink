export interface VitalSignDefinition {
  id: string;
  patientId: string;
  name: string;
  unit: string;
  minValue?: number;
  maxValue?: number;
}
