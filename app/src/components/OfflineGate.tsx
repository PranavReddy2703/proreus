import React, { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Feather, AlertTriangle } from '@expo/vector-icons';
import { Power } from 'lucide-react-native';
import { useUIStore } from '../store/useUIStore';

export const OfflineGate = ({ children }: { children: React.ReactNode }) => {
  const { isServerOnline, setServerOnline, showToast } = useUIStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [isWaking, setIsWaking] = useState(false);

  if (isServerOnline) {
    return <>{children}</>;
  }

  const handleWake = () => {
    setIsWaking(true);
    // Simulate WoL packet delay
    setTimeout(() => {
      setIsWaking(false);
      setModalVisible(false);
      setServerOnline(true);
      showToast('Magic packet sent. Server is now online.', 'success');
    }, 1500);
  };

  return (
    <View className="flex-1 bg-[#09090B] justify-center items-center px-6">
      <View className="w-full bg-white/5 border border-white/10 border-t-white/20 p-8 rounded-3xl items-center shadow-2xl shadow-black">
        <Feather name="wifi-off" size={48} color="#A1A1AA" className="mb-6 opacity-80" />
        <Text className="text-white font-bold text-xl mb-2 text-center">Server Offline</Text>
        <Text className="text-zinc-400 text-sm mb-8 text-center leading-relaxed">
          The active server is not responding to health checks or has been powered down.
        </Text>
        
        <Pressable 
          className="flex-row items-center bg-[#2DD4BF]/20 px-6 py-3 rounded-xl border border-[#2DD4BF]/40 active:bg-[#2DD4BF]/30 shadow-lg shadow-[#2DD4BF]/20"
          onPress={() => setModalVisible(true)}
        >
          <Power size={16} color="#2DD4BF" className="mr-3" />
          <Text className="text-[#2DD4BF] font-black text-sm uppercase tracking-widest">Wake Server</Text>
        </Pressable>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/80 justify-center items-center px-4">
          <View className="w-full bg-[#09090B] border border-white/10 border-t-white/20 shadow-2xl shadow-black rounded-3xl p-6">
            <View className="flex-row items-center mb-4">
              <AlertTriangle size={24} color="#2DD4BF" className="mr-3" />
              <Text className="text-white font-bold text-lg">Send Magic Packet</Text>
            </View>
            <Text className="text-zinc-300 text-sm mb-6 leading-relaxed">
              Are you sure you want to broadcast a Wake-on-LAN (WoL) packet to this server's MAC address?
            </Text>
            
            <View className="flex-row gap-3">
              <Pressable 
                onPress={() => setModalVisible(false)}
                disabled={isWaking}
                className="flex-1 py-3 items-center justify-center rounded-xl bg-white/5 border border-white/10"
              >
                <Text className="text-white font-bold text-xs uppercase tracking-widest">Cancel</Text>
              </Pressable>
              <Pressable 
                onPress={handleWake}
                disabled={isWaking}
                className={`flex-1 py-3 items-center justify-center rounded-xl border ${
                  isWaking 
                    ? 'bg-[#2DD4BF]/10 border-[#2DD4BF]/20 shadow-[#2DD4BF]/10' 
                    : 'bg-[#2DD4BF]/20 border-[#2DD4BF]/40 shadow-[#2DD4BF]/20'
                }`}
              >
                <Text className="font-black text-[#2DD4BF] text-xs uppercase tracking-widest">
                  {isWaking ? 'Sending...' : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
