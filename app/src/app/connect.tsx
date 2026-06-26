import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuthStore } from '../store/useAuthStore';
import { client } from '../generated/api/client.gen';

export default function ConnectScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const setConfig = useAuthStore((state) => state.setConfig);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2DD4BF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const payload = JSON.parse(data);
      if (payload.ip && payload.port && payload.key) {
        const config = {
          ip: payload.ip,
          port: payload.port,
          key: payload.key,
        };
        
        // Configure the global client immediately
        client.setConfig({
          baseUrl: `http://${payload.ip}:${payload.port}/api/v1`,
          headers: {
            'X-API-Key': payload.key,
          },
        });

        setConfig(config);
      } else {
        setError("Invalid QR Code. Please scan a Proreus agent QR code.");
        setTimeout(() => setScanned(false), 2000);
      }
    } catch (err) {
      setError("Failed to read QR Code.");
      setTimeout(() => setScanned(false), 2000);
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <Text style={styles.text}>Camera scanning is not supported on web. Please use a physical device.</Text>
      ) : (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />
      )}
      
      <View style={styles.overlay}>
        <View style={styles.scanBox} />
        <Text style={styles.scanText}>Scan Server QR Code</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    marginBottom: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#2DD4BF',
    backgroundColor: 'transparent',
    borderRadius: 20,
    marginBottom: 30,
  },
  scanText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#EF4444',
    marginTop: 10,
    fontWeight: 'bold',
  }
});
