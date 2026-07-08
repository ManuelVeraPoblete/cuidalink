import { PatientContact, PatientContactCategory } from '@/domain/entities';

export interface CreatePatientContactData {
  name: string;
  category: PatientContactCategory;
  relationship: string;
  phone: string;
  email: string | null;
  note: string | null;
  priority: boolean;
}

export interface PatientContactRepository {
  listContacts(patientId: string): Promise<PatientContact[]>;
  createContact(patientId: string, data: CreatePatientContactData): Promise<PatientContact>;
  updateContact(patientId: string, contactId: string, data: CreatePatientContactData): Promise<PatientContact>;
}
