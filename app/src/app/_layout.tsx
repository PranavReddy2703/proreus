import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OverlayProvider } from '../components/OverlayProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { client } from '../generated/api/client.gen';
import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
// @ts-ignore
import './global.css';

const queryClient = new QueryClient();

function RootLayoutContent() {
  const config = useAuthStore(state => state.config);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inConnectGroup = segments[0] === 'connect';

    if (!config && !inConnectGroup) {
      // Redirect to connect screen
      router.replace('/connect');
    } else if (config) {
      // Apply config to API client
      client.setConfig({
        baseUrl: `http://${config.ip}:${config.port}/api/v1`,
        headers: {
          'X-API-Key': config.key
        }
      });

      // If they are on the connect screen, send them back to tabs
      if (inConnectGroup) {
        router.replace('/');
      }
    }
  }, [config, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="connect" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <OverlayProvider>
          <RootLayoutContent />
        </OverlayProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
