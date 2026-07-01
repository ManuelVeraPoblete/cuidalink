import apiClient from '@/data/http/apiClient';
import { PatientRepository, CreatePatientData } from '@/domain/repositories/PatientRepository';
import { Patient, Collaborator } from '@/domain/entities';

export class ApiPatientRepository implements PatientRepository {
  async listPatients(): Promise<Patient[]> {
    const res = await apiClient.get<Patient[]>('/patients');
    return res.data;
  }

  async getPatient(id: string): Promise<Patient> {
    const res = await apiClient.get<Patient>(`/patients/${id}`);
    return res.data;
  }

  async createPatient(data: CreatePatientData): Promise<Patient> {
    const res = await apiClient.post<Patient>('/patients', {
      fullName: data.fullName,
      birthDate: data.birthDate,
      gender: data.gender,
      identificationNumber: data.identificationNumber,
      address: data.address,
      healthInsurance: data.healthInsurance,
      bloodType: data.bloodType,
      healthCondition: '',
      allergies: '',
      emergencyContact: {
        name: data.emergencyContactName,
        phone: data.emergencyContactPhone,
      },
    });
    return res.data;
  }

  async updatePatient(id: string, data: CreatePatientData): Promise<Patient> {
    const res = await apiClient.put<Patient>(`/patients/${id}`, {
      fullName: data.fullName,
      birthDate: data.birthDate,
      gender: data.gender,
      identificationNumber: data.identificationNumber,
      address: data.address,
      healthInsurance: data.healthInsurance,
      bloodType: data.bloodType,
      healthCondition: '',
      allergies: '',
      emergencyContact: {
        name: data.emergencyContactName,
        phone: data.emergencyContactPhone,
      },
    });
    return res.data;
  }

  async deletePatient(id: string): Promise<void> {
    await apiClient.delete(`/patients/${id}`);
  }

  async getCollaborators(patientId: string): Promise<Collaborator[]> {
    const res = await apiClient.get<Collaborator[]>(`/patients/${patientId}/collaborators`);
    return res.data;
  }

  async getInvitationCode(patientId: string): Promise<string> {
    const res = await apiClient.post<{ code: string }>(`/patients/${patientId}/invitation`);
    return res.data.code;
  }

  async joinPatient(code: string): Promise<void> {
    await apiClient.post('/patients/join', { code });
  }
}
