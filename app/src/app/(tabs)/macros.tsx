import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, Platform, Modal, TextInput, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Command, Play, Check, AlertTriangle, Plus, Trash2, TerminalSquare } from 'lucide-react-native';
import { useUIStore } from '../../store/useUIStore';
import { useTerminalStore } from '../../store/useTerminalStore';
import { OfflineGate } from '../../components/OfflineGate';
import { TerminalOverlay } from '../../components/TerminalOverlay';
import { withBiometricAuth } from '../../utils/biometrics';
import Animated, { withRepeat, withTiming, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { getSystemMacros, createSystemMacro, deleteSystemMacro, executeSystemMacro } from '../../generated/api';

type Macro = Awaited<ReturnType<typeof getSystemMacros>>['data'][0];

function useMacros() {
  return useQuery({
    queryKey: ['macros'],
    queryFn: async () => {
      const res = await getSystemMacros();
      if (res.error) throw res.error;
      return res.data || [];
    }
  });
}

function useCreateMacro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string, description: string, command: string, isDangerous: boolean }) => {
      const res = await createSystemMacro({ body: data });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['macros'] })
  });
}

function useDeleteMacro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteSystemMacro({ path: { id } });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['macros'] })
  });
}

function useRunMacro() {
  return useMutation({
    mutationFn: async (macroId: string) => {
      const res = await executeSystemMacro({ path: { id: macroId } });
      if (res.error) throw res.error;
      return res.data;
    }
  });
}

const SkeletonCard = () => (
  <View className="flex-1 bg-white/5 border border-white/5 border-t-white/10 rounded-2xl p-4 m-2 opacity-30 min-h-[160px]">
    <View className="flex-row justify-between mb-4">
      <View className="h-8 w-8 bg-white/10 rounded-lg" />
      <View className="h-6 w-16 bg-white/10 rounded-md" />
    </View>
    <View className="h-4 w-3/4 bg-white/10 rounded-md mb-2" />
    <View className="h-3 w-full bg-white/5 rounded-md mb-1" />
    <View className="h-3 w-1/2 bg-white/5 rounded-md mt-auto" />
  </View>
);

const MacroCard = React.memo(({ 
  macro, 
  onRunPress, 
  onDeletePress,
  isExecuting, 
  isSuccess 
}: { 
  macro: Macro, 
  onRunPress: (m: Macro) => void,
  onDeletePress: (m: Macro) => void,
  isExecuting: boolean,
  isSuccess: boolean
}) => {
  return (
    <View className="flex-1 bg-white/5 border border-white/5 border-t-white/10 shadow-2xl shadow-black/50 rounded-2xl p-4 m-2 flex-col min-h-[160px]">
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-row items-center gap-2">
          <View className="bg-white/10 p-2 rounded-lg border border-white/5 shadow-inner">
            <Command size={16} color={macro.isDangerous ? "#FB7185" : "#A1A1AA"} />
          </View>
          <Pressable 
            className="p-1.5 rounded-lg bg-transparent border border-transparent active:bg-white/5"
            onPress={() => onDeletePress(macro)}
          >
            <Trash2 size={14} color="#71717A" />
          </Pressable>
        </View>
        <Pressable 
          onPress={() => onRunPress(macro)}
          disabled={isExecuting || isSuccess}
          className={`flex-row items-center px-2.5 py-1.5 rounded-lg border shadow-sm ${
            isSuccess ? 'bg-[#4ADE80]/20 border-[#4ADE80]/40 shadow-[#4ADE80]/20' :
            isExecuting ? 'bg-[#FBBF24]/20 border-[#FBBF24]/40 shadow-[#FBBF24]/20' :
            'bg-[#2DD4BF]/20 border-[#2DD4BF]/40 shadow-[#2DD4BF]/20'
          }`}
        >
          {isSuccess ? (
            <>
              <Text className="text-[#4ADE80] text-[9px] uppercase tracking-widest font-black mr-1.5">Done</Text>
              <Check size={10} color="#4ADE80" strokeWidth={3} />
            </>
          ) : isExecuting ? (
            <Text className="text-[#FBBF24] text-[9px] uppercase tracking-widest font-black">Running</Text>
          ) : (
            <>
              <Text className="text-[#2DD4BF] text-[9px] uppercase tracking-widest font-black mr-1.5">Run</Text>
              <Play size={10} color="#2DD4BF" fill="#2DD4BF" />
            </>
          )}
        </Pressable>
      </View>
      <Text className="text-white font-bold text-sm mb-1.5" numberOfLines={1}>{macro.name}</Text>
      <Text className="text-zinc-500 text-[10px] tracking-wide leading-tight mb-3" numberOfLines={2}>{macro.description}</Text>
      <View className="mt-auto bg-black/40 px-2 py-1.5 rounded border border-white/5 shadow-inner">
        <Text className="text-zinc-400 text-[9px] font-mono leading-tight" numberOfLines={1}>{macro.command}</Text>
      </View>
    </View>
  );
});

const ConfirmationModal = ({ 
  visible, 
  macro, 
  action,
  onConfirm, 
  onCancel 
}: { 
  visible: boolean, 
  macro: Macro | null, 
  action: 'run' | 'delete',
  onConfirm: () => void, 
  onCancel: () => void 
}) => {
  if (!macro) return null;

  const isDelete = action === 'delete';
  const title = isDelete ? 'Delete Macro' : 'Confirm Execution';
  const message = isDelete 
    ? 'Are you sure you want to permanently delete this macro?' 
    : 'Are you sure you want to run this macro on the server?';
  const confirmText = isDelete ? 'Delete' : 'Execute';
  const confirmColor = isDelete ? '#FB7185' : (macro.isDangerous ? '#FB7185' : '#2DD4BF');
  const confirmBgClass = isDelete || macro.isDangerous 
    ? 'bg-[#FB7185]/20 border-[#FB7185]/40 shadow-[#FB7185]/20'
    : 'bg-[#2DD4BF]/20 border-[#2DD4BF]/40 shadow-[#2DD4BF]/20';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/80 justify-center items-center px-4">
        <View className="w-full bg-[#09090B] border border-white/10 border-t-white/20 shadow-2xl shadow-black rounded-3xl p-6">
          <View className="flex-row items-center mb-4">
            <AlertTriangle size={24} color={confirmColor} className="mr-3" />
            <Text className="text-white font-bold text-lg">{title}</Text>
          </View>
          <Text className="text-zinc-300 text-sm mb-4 leading-relaxed">
            {message}
          </Text>
          <View className="bg-white/5 p-4 rounded-xl border border-white/5 mb-6 shadow-inner">
            <Text className="text-white font-bold mb-1.5">{macro.name}</Text>
            <Text className="text-zinc-500 text-[10px] font-mono">{macro.command}</Text>
          </View>
          
          <View className="flex-row gap-3">
            <Pressable 
              onPress={onCancel}
              className="flex-1 py-3 items-center justify-center rounded-xl bg-white/5 border border-white/10"
            >
              <Text className="text-white font-bold text-xs uppercase tracking-widest">Cancel</Text>
            </Pressable>
            <Pressable 
              onPress={onConfirm}
              className={`flex-1 py-3 items-center justify-center rounded-xl border ${confirmBgClass}`}
            >
              <Text 
                className="font-black text-xs uppercase tracking-widest" 
                style={{ color: confirmColor }}
              >
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const AddMacroModal = ({
  visible,
  onClose,
  onSave
}: {
  visible: boolean,
  onClose: () => void,
  onSave: (macro: Partial<Macro>) => void
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [command, setCommand] = useState('');
  const [isDangerous, setIsDangerous] = useState(false);

  const handleSave = () => {
    if (!name || !command) return;
    onSave({ name, description, command, isDangerous });
    setName('');
    setDescription('');
    setCommand('');
    setIsDangerous(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/80 justify-end sm:justify-center items-center px-4 pb-10">
        <View className="w-full bg-[#09090B] border border-white/10 border-t-white/20 shadow-2xl shadow-black rounded-3xl p-6">
          <Text className="text-white font-bold text-lg mb-6">Create New Macro</Text>
          
          <View className="gap-y-4 mb-6">
            <View>
              <Text className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-2">Name</Text>
              <TextInput 
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#2DD4BF]/50"
                placeholder="e.g. Restart Nginx"
                placeholderTextColor="#71717A"
                value={name}
                onChangeText={setName}
              />
            </View>
            
            <View>
              <Text className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-2">Description</Text>
              <TextInput 
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#2DD4BF]/50"
                placeholder="Briefly describe what this does"
                placeholderTextColor="#71717A"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View>
              <Text className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-2">Command</Text>
              <TextInput 
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#2DD4BF] text-xs font-mono focus:border-[#2DD4BF]/50"
                placeholder="sudo systemctl restart nginx"
                placeholderTextColor="#71717A"
                value={command}
                onChangeText={setCommand}
                multiline
              />
            </View>

            <View className="flex-row items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 mt-2">
              <View className="flex-row items-center">
                <AlertTriangle size={16} color={isDangerous ? "#FB7185" : "#A1A1AA"} className="mr-3" />
                <View>
                  <Text className="text-white font-bold text-sm">Dangerous Command</Text>
                  <Text className="text-zinc-500 text-[10px] mt-0.5">Requires explicit confirmation</Text>
                </View>
              </View>
              <Switch 
                value={isDangerous} 
                onValueChange={setIsDangerous} 
                trackColor={{ false: '#27272A', true: '#FB7185' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
          
          <View className="flex-row gap-3">
            <Pressable 
              onPress={onClose}
              className="flex-1 py-3 items-center justify-center rounded-xl bg-white/5 border border-white/10"
            >
              <Text className="text-white font-bold text-xs uppercase tracking-widest">Cancel</Text>
            </Pressable>
            <Pressable 
              onPress={handleSave}
              className={`flex-1 py-3 items-center justify-center rounded-xl border ${
                name && command ? 'bg-[#2DD4BF]/20 border-[#2DD4BF]/40 shadow-[#2DD4BF]/20' : 'bg-white/5 border-white/10 opacity-50'
              }`}
              disabled={!name || !command}
            >
              <Text className={`font-black text-xs uppercase tracking-widest ${name && command ? 'text-[#2DD4BF]' : 'text-zinc-500'}`}>
                Save Macro
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const TerminalFAB = () => {
  const { isOpen, isExecuting, openTerminal } = useTerminalStore();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (isExecuting && !isOpen) {
      opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    } else {
      opacity.value = 0;
    }
  }, [isExecuting, isOpen]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Pressable 
      onPress={openTerminal}
      className="absolute bottom-24 right-6 bg-[#2DD4BF] w-14 h-14 rounded-full shadow-2xl shadow-black/80 items-center justify-center border border-[#2DD4BF]/50 active:scale-95 z-50"
    >
      <TerminalSquare size={24} color="#000000" />
      {isExecuting && !isOpen && (
        <Animated.View 
          style={[animatedStyle, { position: 'absolute', top: 0, right: 0, width: 14, height: 14, backgroundColor: '#4ADE80', borderRadius: 7, borderWidth: 2, borderColor: '#09090B' }]} 
        />
      )}
    </Pressable>
  );
};

export default function MacrosScreen() {
  const insets = useSafeAreaInsets();
  const { data: macros, isLoading } = useMacros();
  const executeMutation = useRunMacro();
  const createMutation = useCreateMacro();
  const deleteMutation = useDeleteMacro();
  const showToast = useUIStore((state) => state.showToast);

  const [selectedMacro, setSelectedMacro] = useState<Macro | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalAction, setModalAction] = useState<'run' | 'delete'>('run');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleRunPress = (macro: Macro) => {
    withBiometricAuth(() => {
      setSelectedMacro(macro);
      setModalAction('run');
      setModalVisible(true);
    });
  };

  const handleDeletePress = (macro: Macro) => {
    setSelectedMacro(macro);
    setModalAction('delete');
    setModalVisible(true);
  };

  const handleConfirm = () => {
    if (!selectedMacro) return;
    setModalVisible(false);

    if (modalAction === 'delete') {
      deleteMutation.mutate(selectedMacro.id);
      showToast(`Macro "${selectedMacro.name}" deleted.`, 'success');
      return;
    }

    setExecutingId(selectedMacro.id);
    
    const termStore = useTerminalStore.getState();
    termStore.setExecuting(true);
    termStore.addLine(selectedMacro.command, 'command');
    termStore.addLine(`Executing macro: ${selectedMacro.name}...`, 'system');
    
    executeMutation.mutate(selectedMacro.id, {
      onSuccess: (data) => {
        setExecutingId(null);
        setSuccessId(selectedMacro.id);
        
        if (data.output) {
          const lines = data.output.trim().split('\n');
          lines.forEach(line => termStore.addLine(line, 'output'));
        }
        
        if (data.success) {
          termStore.addLine(`[SUCCESS] Task completed.`, 'system');
        } else {
          termStore.addLine(`[ERROR] Task failed.`, 'error');
        }
        
        termStore.setExecuting(false);
        setTimeout(() => setSuccessId(null), 2000);
      },
      onError: (err) => {
        setExecutingId(null);
        termStore.addLine(`[ERROR] Request failed: ${err}`, 'error');
        termStore.setExecuting(false);
      }
    });
  };

  return (
    <OfflineGate>
      <View className="flex-1 bg-[#09090B]">
        <View style={{ paddingTop: insets.top + (Platform.OS === 'android' ? 60 : 70) }} className="px-6 pb-2 flex-row justify-between items-center">
          <Text className="text-white font-black text-2xl tracking-tight">System Macros</Text>
          <Pressable 
            className="w-10 h-10 bg-[#2DD4BF]/20 rounded-full items-center justify-center border border-[#2DD4BF]/40 active:bg-[#2DD4BF]/30 shadow-lg shadow-[#2DD4BF]/20"
            onPress={() => setIsAddModalVisible(true)}
          >
            <Plus size={20} color="#2DD4BF" />
          </Pressable>
        </View>

        <FlatList
          data={macros}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 8, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MacroCard 
              macro={item} 
              onRunPress={handleRunPress} 
              onDeletePress={handleDeletePress}
              isExecuting={executingId === item.id}
              isSuccess={successId === item.id}
            />
          )}
          ListEmptyComponent={
            isLoading ? (
              <View className="flex-row w-full mt-2 px-2">
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : (
              <View className="items-center mt-20 opacity-50">
                <Command size={48} color="#71717A" className="mb-4" />
                <Text className="text-zinc-500 font-medium">No macros configured</Text>
              </View>
            )
          }
        />

        <ConfirmationModal 
          visible={modalVisible}
          macro={selectedMacro}
          action={modalAction}
          onConfirm={handleConfirm}
          onCancel={() => setModalVisible(false)}
        />

        <AddMacroModal 
          visible={isAddModalVisible}
          onClose={() => setIsAddModalVisible(false)}
          onSave={(macro) => {
            createMutation.mutate(macro as any);
            setIsAddModalVisible(false);
          }}
        />
        
        <TerminalFAB />
        <TerminalOverlay />
      </View>
    </OfflineGate>
  );
}
