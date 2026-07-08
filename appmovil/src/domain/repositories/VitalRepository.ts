import { VitalSignDefinition, VitalRecord, VitalMeasurement } from '@/domain/entities';

export type CreateVitalDefinitionData = {
  name: string;
  unit: string;
  normalRangeMin: number;
  normalRangeMax: number;
};

export interface VitalRepository {
  listDefinitions(patientId: string): Promise<VitalSignDefinition[]>;
  createDefinition(patientId: string, data: CreateVitalDefinitionData): Promise<VitalSignDefinition>;
  listRecords(patientId: string, from: string, to: string): Promise<VitalRecord[]>;
  recordVitals(patientId: string, measurements: VitalMeasurement[]): Promise<VitalRecord>;
}
