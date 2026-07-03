import { User } from '@/domain/entities';

export type UpdateProfileData = {
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  specialty?: string | null;
  experience?: string | null;
};

export interface AuthRepository {
  loginWithEmail(email: string, password: string): Promise<User>;
  register(name: string, email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  getMe(): Promise<User>;
  updateFcmToken(token: string): Promise<void>;
  updateProfile(data: UpdateProfileData): Promise<User>;
}
