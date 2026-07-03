export interface User {
  id: string;
  name: string;
  email: string;
  role: 'CAREGIVER';
  phone?: string | null;
  address?: string | null;
  specialty?: string | null;
  experience?: string | null;
}
