import apiClient from '@/data/http/apiClient';
import { CreatePatientContactData, PatientContactRepository } from '@/domain/repositories/PatientContactRepository';
import { PatientContact } from '@/domain/entities';

export class ApiPatientContactRepository implements PatientContactRepository {
  async listContacts(patientId: string): Promise<PatientContact[]> {
    const res = await apiClient.get<PatientContact[]>(`/patients/${patientId}/contacts`);
    return res.data;
  }

  async createContact(patientId: string, data: CreatePatientContactData): Promise<PatientContact> {
    const res = await apiClient.post<PatientContact>(`/patients/${patientId}/contacts`, data);
    return res.data;
  }

  async updateContact(patientId: string, contactId: string, data: CreatePatientContactData): Promise<PatientContact> {
    const res = await apiClient.put<PatientContact>(`/patients/${patientId}/contacts/${contactId}`, data);
    return res.data;
  }
}
