export interface Patient {
  id: string;
  fullName: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  identificationNumber: string;
  address: string;
  healthInsurance: string;
  bloodType: string;
  emergencyContact: { name: string; phone: string };
  isOwner: boolean;
  active: boolean;
}
