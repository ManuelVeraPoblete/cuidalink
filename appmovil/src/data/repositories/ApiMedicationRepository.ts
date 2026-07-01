import apiClient from '@/data/http/apiClient';
import { MedicationRepository } from '@/domain/repositories/MedicationRepository';
import { Medication, MedicationLog } from '@/domain/entities';

export class ApiMedicationRepository implements MedicationRepository {
  async listMedications(patientId: string): Promise<Medication[]> {
    const res = await apiClient.get<Medication[]>(`/patients/${patientId}/medications`);
    return res.data;
  }

  async getDailyLogs(patientId: string, date: string): Promise<MedicationLog[]> {
    const res = await apiClient.get<MedicationLog[]>(
      `/patients/${patientId}/medication-logs?date=${date}`,
    );
    return res.data;
  }

  async confirmLog(logId: string): Promise<MedicationLog> {
    const res = await apiClient.post<MedicationLog>(`/medication-logs/${logId}/confirm`);
    return res.data;
  }

  async missLog(logId: string): Promise<MedicationLog> {
    const res = await apiClient.post<MedicationLog>(`/medication-logs/${logId}/miss`);
    return res.data;
  }
}
