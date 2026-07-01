import { Patient, Collaborator } from '@/domain/entities';

export interface CreatePatientData {
  fullName: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  identificationNumber: string;
  address: string;
  healthInsurance: string;
  bloodType: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface PatientRepository {
  listPatients(): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient>;
  createPatient(data: CreatePatientData): Promise<Patient>;
  updatePatient(id: string, data: CreatePatientData): Promise<Patient>;
  deletePatient(id: string): Promise<void>;
  getCollaborators(patientId: string): Promise<Collaborator[]>;
  getInvitationCode(patientId: string): Promise<string>;
  joinPatient(code: string): Promise<void>;
}
