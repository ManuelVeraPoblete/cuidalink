import { create } from 'zustand';
import { User } from '@/domain/entities';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  selectedPatientId: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setSelectedPatientId: (id: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  selectedPatientId: null,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setSelectedPatientId: (selectedPatientId) => set({ selectedPatientId }),
}));
