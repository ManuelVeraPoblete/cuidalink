import * as SecureStore from 'expo-secure-store';
import apiClient from '@/data/http/apiClient';
import { AuthRepository } from '@/domain/repositories/AuthRepository';
import { User } from '@/domain/entities';

export class ApiAuthRepository implements AuthRepository {
  async loginWithEmail(email: string, password: string): Promise<User> {
    const { data } = await apiClient.post<{ token: string }>('/auth/login', { email, password });
    await SecureStore.setItemAsync('jwt_token', data.token);
    const me = await apiClient.get<User>('/auth/me');
    return me.data;
  }

  async register(name: string, email: string, password: string): Promise<User> {
    const { data } = await apiClient.post<{ token: string }>('/auth/register', { name, email, password });
    await SecureStore.setItemAsync('jwt_token', data.token);
    const me = await apiClient.get<User>('/auth/me');
    return me.data;
  }

  async updateFcmToken(token: string): Promise<void> {
    await apiClient.post('/auth/fcm-token', { token });
  }

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('jwt_token');
  }

  async getMe(): Promise<User> {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  }
}
