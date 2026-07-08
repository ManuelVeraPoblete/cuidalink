import apiClient from '@/data/http/apiClient';
import { CreateVitalDefinitionData, VitalRepository } from '@/domain/repositories/VitalRepository';
import { VitalSignDefinition, VitalRecord, VitalMeasurement } from '@/domain/entities';

export class ApiVitalRepository implements VitalRepository {
  async listDefinitions(patientId: string): Promise<VitalSignDefinition[]> {
    const res = await apiClient.get<VitalSignDefinition[]>(
      `/patients/${patientId}/vital-definitions`,
    );
    return res.data;
  }

  async createDefinition(patientId: string, data: CreateVitalDefinitionData): Promise<VitalSignDefinition> {
    const res = await apiClient.post<VitalSignDefinition>(
      `/patients/${patientId}/vital-definitions`,
      data,
    );
    return res.data;
  }

  async listRecords(patientId: string, from: string, to: string): Promise<VitalRecord[]> {
    const res = await apiClient.get<VitalRecord[]>(`/patients/${patientId}/vital-records`, {
      params: { from, to },
    });
    return res.data;
  }

  async recordVitals(patientId: string, measurements: VitalMeasurement[]): Promise<VitalRecord> {
    const res = await apiClient.post<VitalRecord>(`/patients/${patientId}/vital-records`, {
      measurements,
    });
    return res.data;
  }
}
