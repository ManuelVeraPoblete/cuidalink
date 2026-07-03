import apiClient from '@/data/http/apiClient';
import { MedicationRepository, CreateMedicationData } from '@/domain/repositories/MedicationRepository';
import { Medication, MedicationLog } from '@/domain/entities';

export class ApiMedicationRepository implements MedicationRepository {
  async listMedications(patientId: string): Promise<Medication[]> {
    const res = await apiClient.get<Medication[]>(`/patients/${patientId}/medications`);
    return res.data;
  }

  async createMedication(patientId: string, data: CreateMedicationData): Promise<Medication> {
    const res = await apiClient.post<Medication>(`/patients/${patientId}/medications`, {
      name: data.name,
      dosage: data.dosage,
      instructions: data.instructions,
      schedule: {
        startTime: data.startTime,
        frequencyHours: data.frequencyHours,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    });
    return res.data;
  }

  async getDailyLogs(patientId: string, date: string): Promise<MedicationLog[]> {
    const res = await apiClient.get<MedicationLog[]>(
      `/patients/${patientId}/medication-logs?date=${date}`,
    );
    return res.data;
  }

  async confirmLog(logId: string): Promise<MedicationLog> {
    const res = await apiClient.patch<MedicationLog>(`/medication-logs/${logId}`, { status: 'CONFIRMED' });
    return res.data;
  }

  async missLog(logId: string): Promise<MedicationLog> {
    const res = await apiClient.patch<MedicationLog>(`/medication-logs/${logId}`, { status: 'MISSED' });
    return res.data;
  }
}
