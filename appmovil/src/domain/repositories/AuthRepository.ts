import { User } from '@/domain/entities';

export interface AuthRepository {
  loginWithEmail(email: string, password: string): Promise<User>;
  register(name: string, email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  getMe(): Promise<User>;
  updateFcmToken(token: string): Promise<void>;
}
