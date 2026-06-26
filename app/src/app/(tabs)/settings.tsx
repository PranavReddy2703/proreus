import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Switch, Modal, ScrollView, Platform, LayoutAnimation, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Server, Lock, Palette, Info, Trash2, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react-native';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Components ---
const SettingsCard = ({ title, icon: Icon, children, className = "" }: any) => (
  <View className={`bg-white/5 border border-white/5 border-t-white/10 shadow-2xl shadow-black/50 rounded-2xl p-5 mb-4 ${className}`}>
    <View className="flex-row items-center mb-5 border-b border-white/5 pb-3">
      <View className="bg-white/10 p-1.5 rounded-lg border border-white/5 mr-3 shadow-inner">
        <Icon size={16} color="#A1A1AA" />
      </View>
      <Text className="text-white font-bold text-sm tracking-wide">{title}</Text>
    </View>
    <View className="flex-col gap-4">
      {children}
    </View>
  </View>
);

const SecureInput = ({ label, name, control, placeholder, secureTextEntry = false, isNumeric = false, isMultiline = false }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);
  
  return (
    <View className="flex-col">
      <Text className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-1.5 ml-1">{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View className={`flex-row items-center bg-black/40 border rounded-xl px-3 shadow-inner shadow-black/50 transition-colors ${
            isFocused ? 'border-white/20 bg-white/5' : 'border-white/5'
          } ${isMultiline ? 'min-h-[80px] items-start pt-3' : 'h-12'}`}>
            <TextInput
              className={`flex-1 text-white text-sm font-mono ${isMultiline ? 'h-full' : ''}`}
              placeholder={placeholder}
              placeholderTextColor="#52525B"
              onBlur={() => {
                setIsFocused(false);
                onBlur();
              }}
              onFocus={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsFocused(true);
              }}
              onChangeText={onChange}
              value={value || ''}
              secureTextEntry={!showPassword}
              keyboardType={isNumeric ? 'numeric' : 'default'}
              autoCapitalize="none"
              autoCorrect={false}
              multiline={isMultiline}
              textAlignVertical={isMultiline ? 'top' : 'center'}
            />
            {secureTextEntry && (
              <Pressable onPress={() => setShowPassword(!showPassword)} className="ml-2 p-1 active:bg-white/5 rounded-lg">
                {showPassword ? <EyeOff size={16} color="#71717A" /> : <Eye size={16} color="#71717A" />}
              </Pressable>
            )}
          </View>
        )}
      />
    </View>
  );
};

// --- Safe Secure Store Wrapper ---
const SafeSecureStore = {
  getItemAsync: async (key: string) => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  },
  setItemAsync: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  deleteItemAsync: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  }
};

// --- Main Screen ---
type SettingsData = {
  connectionMethod: 'public' | 'tailnet';
  host: string;
  port: string;
  tailnetApiKey: string;
  identityKey: string;
  requireBiometrics: boolean;
  autoLockTimer: string;
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [isSaved, setIsSaved] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  const { control, handleSubmit, watch, reset, setValue } = useForm<SettingsData>({
    defaultValues: {
      connectionMethod: 'public',
      host: '',
      port: '22',
      tailnetApiKey: '',
      identityKey: '',
      requireBiometrics: false,
      autoLockTimer: '5',
    }
  });

  // Load from SecureStore
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const connectionMethodStr = await SafeSecureStore.getItemAsync('connectionMethod');
        const connectionMethod = (connectionMethodStr === 'tailnet' ? 'tailnet' : 'public') as 'public' | 'tailnet';
        const host = await SafeSecureStore.getItemAsync('host') || '';
        const port = await SafeSecureStore.getItemAsync('port') || '22';
        const tailnetApiKey = await SafeSecureStore.getItemAsync('tailnetApiKey') || '';
        const identityKey = await SafeSecureStore.getItemAsync('identityKey') || '';
        const requireBiometricsStr = await SafeSecureStore.getItemAsync('requireBiometrics');
        const autoLockTimer = await SafeSecureStore.getItemAsync('autoLockTimer') || '5';
        
        reset({
          connectionMethod,
          host,
          port,
          tailnetApiKey,
          identityKey,
          requireBiometrics: requireBiometricsStr === 'true',
          autoLockTimer,
        });
        setIsInitialized(true);
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    };
    loadSettings();
  }, [reset]);

  const onSave = async (data: SettingsData) => {
    try {
      await SafeSecureStore.setItemAsync('connectionMethod', data.connectionMethod);
      await SafeSecureStore.setItemAsync('host', data.host);
      await SafeSecureStore.setItemAsync('port', data.port);
      await SafeSecureStore.setItemAsync('tailnetApiKey', data.tailnetApiKey);
      await SafeSecureStore.setItemAsync('identityKey', data.identityKey);
      await SafeSecureStore.setItemAsync('requireBiometrics', String(data.requireBiometrics));
      await SafeSecureStore.setItemAsync('autoLockTimer', data.autoLockTimer);
      
      // trigger success feedback
      if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsSaved(true);
      setTimeout(() => {
        if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsSaved(false);
      }, 2000);
    } catch (e) {
      console.error("Failed to save settings securely", e);
    }
  };

  // Debounced auto-save when values change
  useEffect(() => {
    if (isInitialized) {
      let timeoutId: NodeJS.Timeout;
      const subscription = watch(() => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          handleSubmit(onSave)();
        }, 800);
      });
      return () => {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
      };
    }
  }, [watch, isInitialized, handleSubmit]);

  const handleBiometricToggle = async (val: boolean) => {
    if (val) {
      if (Platform.OS === 'web') {
        alert("Biometrics are not supported on web.");
        setValue('requireBiometrics', false);
        return;
      }
      // User is turning it ON
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to enable biometric protection',
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
        });
        
        if (result.success) {
          setValue('requireBiometrics', true, { shouldDirty: true });
        } else {
          setValue('requireBiometrics', false);
        }
      } else {
        alert("Biometrics are not set up or not available on this device.");
        setValue('requireBiometrics', false);
      }
    } else {
      // User is turning it OFF
      setValue('requireBiometrics', false, { shouldDirty: true });
    }
  };

  const handleClearData = async () => {
    await SafeSecureStore.deleteItemAsync('connectionMethod');
    await SafeSecureStore.deleteItemAsync('host');
    await SafeSecureStore.deleteItemAsync('port');
    await SafeSecureStore.deleteItemAsync('tailnetApiKey');
    await SafeSecureStore.deleteItemAsync('identityKey');
    await SafeSecureStore.deleteItemAsync('requireBiometrics');
    await SafeSecureStore.deleteItemAsync('autoLockTimer');
    
    reset({
      connectionMethod: 'public',
      host: '',
      port: '22',
      tailnetApiKey: '',
      identityKey: '',
      requireBiometrics: false,
      autoLockTimer: '5',
    });
    
    setShowClearModal(false);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    // Simulate heartbeat check
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsTesting(false);
    // Note: In real implementation, this would dispatch a UI toast with result
  };

  const connectionMethod = watch('connectionMethod');
  const currentHost = watch('host');
  
  // Relaxed validation: 100.x.x.x (CGNAT) or *.ts.net / custom FQDN (basic check)
  const isHostValidTailnet = connectionMethod !== 'tailnet' || 
    !currentHost || 
    /^(100\.\d+\.\d+\.\d+|[a-zA-Z0-9.-]+)$/.test(currentHost);
  const showWarning = connectionMethod === 'tailnet' && currentHost.length > 0 && !isHostValidTailnet;

  return (
    <View className="flex-1 bg-[#09090B]">
      {/* Header Container */}
      <View 
        className="px-6 pb-3 border-b border-white/5 bg-black/40 z-20 flex-row justify-between items-end" 
        style={{ paddingTop: insets.top + (Platform.OS === 'android' ? 60 : 70) }}
      >
        <Text className="text-white font-bold text-xl tracking-tight mb-1">Configuration</Text>
        <View className="h-6 justify-center">
          {isSaved && (
            <View className="flex-row items-center bg-[#4ADE80]/10 px-2.5 py-1 rounded-full border border-[#4ADE80]/30 shadow-lg shadow-[#4ADE80]/20">
              <Check size={10} color="#4ADE80" strokeWidth={3} className="mr-1.5" />
              <Text className="text-[#4ADE80] text-[9px] uppercase tracking-widest font-black">Saved</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4 pt-4" 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <SettingsCard title="Connection Parameters" icon={Server}>
          <View className="bg-black/20 p-1 rounded-xl border border-white/5 flex-row mb-2">
            <Pressable 
              onPress={() => setValue('connectionMethod', 'public', { shouldDirty: true })}
              className={`flex-1 py-2 rounded-lg items-center ${connectionMethod === 'public' ? 'bg-white/10 shadow-sm' : ''}`}
            >
              <Text className={`text-xs font-bold ${connectionMethod === 'public' ? 'text-white' : 'text-zinc-500'}`}>Public IP</Text>
            </Pressable>
            <Pressable 
              onPress={() => setValue('connectionMethod', 'tailnet', { shouldDirty: true })}
              className={`flex-1 py-2 rounded-lg items-center ${connectionMethod === 'tailnet' ? 'bg-[#2DD4BF]/20 border border-[#2DD4BF]/30' : ''}`}
            >
              <Text className={`text-xs font-bold ${connectionMethod === 'tailnet' ? 'text-[#2DD4BF]' : 'text-zinc-500'}`}>Tailnet</Text>
            </Pressable>
          </View>
          
          {connectionMethod === 'tailnet' && (
            <View className="flex-row items-center bg-[#2DD4BF]/10 p-3 rounded-xl border border-[#2DD4BF]/20 mb-2">
              <Info size={14} color="#2DD4BF" className="mr-2" />
              <Text className="text-[#2DD4BF] text-[10px] flex-1 leading-tight">Tailscale provides encrypted, direct access without port forwarding.</Text>
            </View>
          )}

          <SecureInput 
            label={connectionMethod === 'tailnet' ? "Tailnet Hostname / IP" : "Host Address"} 
            name="host" 
            control={control} 
            placeholder={connectionMethod === 'tailnet' ? "machine.domain.ts.net or 100.x.x.x" : "root@192.168.1.100"} 
          />
          
          {showWarning && (
            <View className="flex-row items-center bg-[#FBBF24]/10 p-2.5 rounded-lg border border-[#FBBF24]/20 -mt-2 mb-2">
              <AlertTriangle size={12} color="#FBBF24" className="mr-2" />
              <Text className="text-[#FBBF24] text-[9px] flex-1">Warning: Does not look like a standard Tailscale IP or FQDN.</Text>
            </View>
          )}

          {connectionMethod === 'public' ? (
            <SecureInput label="SSH Port" name="port" control={control} placeholder="22" isNumeric={true} />
          ) : (
            <SecureInput 
              label="Tailscale API Key (Optional)" 
              name="tailnetApiKey" 
              control={control} 
              placeholder="tskey-api-xxxxx" 
              secureTextEntry={true} 
            />
          )}

          <SecureInput 
            label="Identity Key (Ed25519)" 
            name="identityKey" 
            control={control} 
            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" 
            secureTextEntry={true} 
            isMultiline={true}
          />
          
          <Pressable 
            onPress={handleTestConnection}
            disabled={isTesting || !currentHost}
            className={`mt-2 py-3 rounded-xl items-center border ${
              isTesting ? 'bg-white/5 border-white/10' : 
              !currentHost ? 'bg-white/5 border-white/5 opacity-50' : 
              'bg-[#2DD4BF]/10 border-[#2DD4BF]/30'
            }`}
          >
            <Text className={`font-black text-xs uppercase tracking-widest ${isTesting || !currentHost ? 'text-zinc-500' : 'text-[#2DD4BF]'}`}>
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Text>
          </Pressable>
        </SettingsCard>

        <SettingsCard title="Security & Authentication" icon={Lock}>
          <View className="flex-row justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
            <View>
              <Text className="text-white text-sm font-semibold mb-0.5">Require Biometrics</Text>
              <Text className="text-zinc-500 text-[10px] uppercase tracking-widest">For sensitive actions</Text>
            </View>
            <Controller
              control={control}
              name="requireBiometrics"
              render={({ field: { value } }) => (
                <Switch 
                  value={value}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: '#27272A', true: '#2DD4BF' }}
                  thumbColor="#FFFFFF"
                />
              )}
            />
          </View>
          <SecureInput label="Auto-Lock Timer (Minutes)" name="autoLockTimer" control={control} placeholder="5" isNumeric={true} />
        </SettingsCard>

        <SettingsCard title="Application Environment" icon={Palette}>
          <View className="flex-row justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5 mb-2">
            <View>
              <Text className="text-white text-sm font-semibold mb-0.5">Dark Theme</Text>
              <Text className="text-zinc-500 text-[10px] uppercase tracking-widest">Enforce cyber-slate design</Text>
            </View>
            <Switch 
              value={true}
              disabled={true}
              trackColor={{ false: '#27272A', true: '#2DD4BF' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View className="flex-row items-center bg-black/10 p-3 rounded-xl border border-white/5">
            <Info size={14} color="#71717A" className="mr-2.5" />
            <Text className="text-zinc-500 text-xs font-mono">Proreus Control Agent v1.0.4-rc</Text>
          </View>
        </SettingsCard>

        <Pressable 
          onPress={() => setShowClearModal(true)}
          className="flex-row items-center justify-center bg-[#FB7185]/10 border border-[#FB7185]/30 rounded-2xl p-4 mb-8 active:bg-[#FB7185]/20 mt-2 shadow-lg shadow-[#FB7185]/10"
        >
          <Trash2 size={16} color="#FB7185" className="mr-2" />
          <Text className="text-[#FB7185] font-black text-xs uppercase tracking-widest">Wipe Secure Enclave</Text>
        </Pressable>
      </ScrollView>

      {/* Destructive Action Modal */}
      <Modal visible={showClearModal} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-center items-center px-4">
          <View className="w-full bg-[#09090B] border border-white/10 border-t-white/20 shadow-2xl shadow-black rounded-3xl p-6">
            <View className="flex-row items-center mb-4">
              <AlertTriangle size={24} color="#FB7185" className="mr-3" />
              <Text className="text-white font-bold text-lg">Wipe All Data?</Text>
            </View>
            <Text className="text-zinc-300 text-sm mb-6 leading-relaxed">
              This will permanently delete your SSH keys and connection settings from the secure enclave. You will lose access to the server.
            </Text>
            
            <View className="flex-row gap-3">
              <Pressable 
                onPress={() => setShowClearModal(false)}
                className="flex-1 py-3 items-center justify-center rounded-xl bg-white/5 border border-white/10 active:bg-white/10"
              >
                <Text className="text-white font-bold text-xs uppercase tracking-widest">Cancel</Text>
              </Pressable>
              <Pressable 
                onPress={handleClearData}
                className="flex-1 py-3 items-center justify-center rounded-xl border bg-[#FB7185]/20 border-[#FB7185]/40 shadow-lg shadow-[#FB7185]/20 active:bg-[#FB7185]/30"
              >
                <Text className="text-[#FB7185] font-black text-xs uppercase tracking-widest">
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
