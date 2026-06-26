import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SafeSecureStore = {
  getItemAsync: async (key: string) => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  }
};

interface ServerState {
  host: string;
  port: string;
  connectionMethod: 'public' | 'tailnet';
  tailnetApiKey: string;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  getConnectionString: () => string;
}

export const useServerState = create<ServerState>((set, get) => ({
  host: '',
  port: '22',
  connectionMethod: 'public',
  tailnetApiKey: '',
  isLoaded: false,

  loadSettings: async () => {
    try {
      const host = await SafeSecureStore.getItemAsync('host') || '';
      const port = await SafeSecureStore.getItemAsync('port') || '22';
      const connectionMethod = (await SafeSecureStore.getItemAsync('connectionMethod')) as 'public' | 'tailnet' || 'public';
      const tailnetApiKey = await SafeSecureStore.getItemAsync('tailnetApiKey') || '';
      
      set({ host, port, connectionMethod, tailnetApiKey, isLoaded: true });
    } catch (e) {
      console.error("Failed to load server state", e);
      set({ isLoaded: true });
    }
  },

  getConnectionString: () => {
    const { host, port, connectionMethod } = get();
    if (connectionMethod === 'tailnet') {
      // Tailscale handles routing without specific port forwarding
      return host;
    }
    // Standard SSH connection
    return `${host}:${port}`;
  }
}));
