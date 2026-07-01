import apiClient from '@/data/http/apiClient';
import { VitalRepository } from '@/domain/repositories/VitalRepository';
import { VitalSignDefinition, VitalRecord } from '@/domain/entities';

export class ApiVitalRepository implements VitalRepository {
  async listDefinitions(patientId: string): Promise<VitalSignDefinition[]> {
    const res = await apiClient.get<VitalSignDefinition[]>(
      `/patients/${patientId}/vital-definitions`,
    );
    return res.data;
  }

  async listRecords(patientId: string): Promise<VitalRecord[]> {
    const res = await apiClient.get<VitalRecord[]>(`/patients/${patientId}/vital-records`);
    return res.data;
  }

  async recordVital(patientId: string, definitionId: string, value: number): Promise<VitalRecord> {
    const res = await apiClient.post<VitalRecord>(`/patients/${patientId}/vital-records`, {
      definitionId, value,
    });
    return res.data;
  }
}
