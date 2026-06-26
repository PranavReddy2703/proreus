import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Pressable, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUIStore } from '../store/useUIStore';
import { Server, Power, Bell, RefreshCw, CheckCircle, Info, XCircle, Plus } from 'lucide-react-native';
import { withBiometricAuth } from '../utils/biometrics';
import { SwipeToConfirm } from './SwipeToConfirm';
import { ActionSheet } from './ActionSheet';
import { executePowerAction } from '../generated/api';

// Global Toast Component
function GlobalToast() {
  const { toast, hideToast } = useUIStore();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (toast.visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 150,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [toast.visible]);

  let bgClass = "bg-white/10 border-white/20";
  let icon = <Info size={16} color="#ffffff" />;
  
  if (toast.type === 'success') {
    bgClass = "bg-[#4ADE80]/10 border-[#4ADE80]/30 shadow-[#4ADE80]/20";
    icon = <CheckCircle size={16} color="#4ADE80" />;
  } else if (toast.type === 'error') {
    bgClass = "bg-[#FB7185]/10 border-[#FB7185]/30 shadow-[#FB7185]/20";
    icon = <XCircle size={16} color="#FB7185" />;
  }

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: insets.top + (Platform.OS === 'android' ? 60 : 70) + 10,
        left: 20,
        right: 20,
        zIndex: 9999,
        transform: [{ translateY }],
      }}
    >
      <Pressable onPress={hideToast} className="items-center">
        <View className={`flex-row items-center px-4 py-3 rounded-2xl border shadow-xl ${bgClass} backdrop-blur-md`}>
          {Platform.OS !== 'android' && <BlurView intensity={40} tint="dark" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 16 }} />}
          <View className="mr-3">{icon}</View>
          <Text className="text-white font-bold text-sm">{toast.message}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Main Overlay Provider
export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const { activeOverlay, hideOverlay, showToast, isServerOnline, setServerOnline } = useUIStore();
  
  // Handlers for power actions
  const handlePowerAction = async (action: 'Shutdown' | 'Reboot') => {
    showToast(`Initiating ${action}...`, 'success');
    hideOverlay();
    
    try {
      await executePowerAction({
        body: { action: action.toLowerCase() as "shutdown" | "reboot" }
      });
      showToast(`${action} command sent successfully`, 'success');
    } catch (error) {
      showToast(`Failed to send ${action} command`, 'error');
    }
  };

  const handleServerSwitch = (server: string) => {
    hideOverlay();
    if (server === 'backup-node') {
      setServerOnline(false);
      showToast(`Switched to ${server} (Offline)`, 'error');
    } else {
      setServerOnline(true);
      showToast(`Connected to ${server}`, 'success');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {children}
      
      <GlobalToast />

      {/* Power Overlay */}
      <ActionSheet 
        visible={activeOverlay === 'power'} 
        onClose={hideOverlay}
        title="Power Options"
      >
        <View className="gap-y-3">
          <SwipeToConfirm
            title="Slide to Shutdown"
            icon={<Power size={20} color="#EF4444" />}
            color="#EF4444"
            trackColor="rgba(239, 68, 68, 0.05)"
            borderColor="rgba(239, 68, 68, 0.15)"
            thumbColor="#27272A"
            textColor="rgba(255, 255, 255, 0.6)"
            onConfirm={() => withBiometricAuth(() => handlePowerAction('Shutdown'))}
          />
          
          <SwipeToConfirm
            title="Slide to Reboot"
            icon={<RefreshCw size={20} color="#2DD4BF" />}
            color="#2DD4BF"
            trackColor="rgba(45, 212, 191, 0.05)"
            borderColor="rgba(45, 212, 191, 0.15)"
            thumbColor="#27272A"
            textColor="rgba(255, 255, 255, 0.6)"
            onConfirm={() => withBiometricAuth(() => handlePowerAction('Reboot'))}
          />
        </View>
      </ActionSheet>

      {/* Server Switcher Overlay */}
      <ActionSheet 
        visible={activeOverlay === 'server-switcher'} 
        onClose={hideOverlay}
        title="Active Connections"
        rightAction={
          <Pressable onPress={() => { hideOverlay(); showToast('Add Server dialog opened.', 'success'); }} className="px-2 py-1">
            <Text className="text-[#2DD4BF] font-bold text-xs uppercase tracking-widest">Add Server</Text>
          </Pressable>
        }
      >
        <View className="gap-y-3">
          <Pressable 
            className="flex-row items-start bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 p-4 rounded-xl"
            onPress={() => handleServerSwitch('proreus-main')}
          >
            <View className="mr-3 mt-[5px]">
              <View className="w-2 h-2 rounded-full bg-[#2DD4BF] shadow-[#2DD4BF] shadow-sm" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-sm mb-0.5" style={{ includeFontPadding: false }}>proreus-main</Text>
              <Text className="text-zinc-500 text-xs font-mono" style={{ includeFontPadding: false }}>root@192.168.1.100</Text>
            </View>
            <View className="mt-[2px]">
              <CheckCircle size={16} color="#2DD4BF" />
            </View>
          </Pressable>

          <Pressable 
            className="flex-row items-start bg-white/5 border border-white/10 p-4 rounded-xl active:bg-white/10"
            onPress={() => handleServerSwitch('backup-node')}
          >
            <View className="mr-3 mt-[5px]">
              <View className="w-2 h-2 rounded-full bg-zinc-600" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-sm mb-0.5" style={{ includeFontPadding: false }}>backup-node</Text>
              <Text className="text-zinc-500 text-xs font-mono" style={{ includeFontPadding: false }}>user@10.0.0.5</Text>
            </View>
            <View className="mt-[2px]">
              <Text className="text-[#FB7185] text-[10px] uppercase tracking-widest font-bold" style={{ includeFontPadding: false }}>Offline</Text>
            </View>
          </Pressable>

        </View>
      </ActionSheet>

      {/* Notifications Drawer/Overlay */}
      <ActionSheet 
        visible={activeOverlay === 'notifications'} 
        onClose={hideOverlay}
        title="System Alerts"
        rightAction={
          <Pressable onPress={() => { hideOverlay(); showToast('All notifications cleared.', 'success'); }} className="px-2 py-1">
            <Text className="text-zinc-400 font-bold text-xs uppercase tracking-widest">Clear</Text>
          </Pressable>
        }
      >
        <View className="gap-y-3">
          <View className="flex-row items-start bg-white/5 border border-white/10 p-4 rounded-xl">
            <View className="mr-3 mt-[2px]">
              <Bell size={16} color="#FBBF24" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-sm mb-1" style={{ includeFontPadding: false }}>High CPU Load</Text>
              <Text className="text-zinc-400 text-xs leading-relaxed" style={{ includeFontPadding: false }}>The main process has been exceeding 80% usage for the last 5 minutes.</Text>
              <Text className="text-zinc-600 text-[10px] uppercase tracking-widest mt-2" style={{ includeFontPadding: false }}>2 Mins Ago</Text>
            </View>
          </View>
          
          <View className="flex-row items-start bg-white/5 border border-white/10 p-4 rounded-xl">
            <View className="mr-3 mt-[2px]">
              <CheckCircle size={16} color="#4ADE80" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-sm mb-1" style={{ includeFontPadding: false }}>Backup Successful</Text>
              <Text className="text-zinc-400 text-xs leading-relaxed" style={{ includeFontPadding: false }}>Weekly volume snapshot completed without errors.</Text>
              <Text className="text-zinc-600 text-[10px] uppercase tracking-widest mt-2" style={{ includeFontPadding: false }}>3 Hours Ago</Text>
            </View>
          </View>
        </View>
      </ActionSheet>
    </View>
  );
}
