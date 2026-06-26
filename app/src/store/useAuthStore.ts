import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ServerConfig {
  ip: string;
  port: string;
  key: string;
}

interface AuthState {
  config: ServerConfig | null;
  setConfig: (config: ServerConfig | null) => void;
  clearConfig: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      config: null,
      setConfig: (config) => set({ config }),
      clearConfig: () => set({ config: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
