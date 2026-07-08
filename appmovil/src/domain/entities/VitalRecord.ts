import { VitalMeasurement } from './VitalMeasurement';

export interface VitalRecord {
  id: string;
  patientId: string;
  recordedById: string;
  recordedAt: string;
  measurements: VitalMeasurement[];
}
