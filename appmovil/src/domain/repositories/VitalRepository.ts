import { VitalSignDefinition, VitalRecord } from '@/domain/entities';

export interface VitalRepository {
  listDefinitions(patientId: string): Promise<VitalSignDefinition[]>;
  listRecords(patientId: string): Promise<VitalRecord[]>;
  recordVital(patientId: string, definitionId: string, value: number): Promise<VitalRecord>;
}
