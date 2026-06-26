import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square, RotateCw, Terminal, Search, Filter, AlertCircle, Box, CheckCircle, X } from 'lucide-react-native';
import { useUIStore } from '../../store/useUIStore';
import { OfflineGate } from '../../components/OfflineGate';
import { getSystemDockerContainers, executeDockerContainerAction, getSystemDockerContainerLogs } from '../../generated/api';

// --- Types ---
type DockerContainer = Awaited<ReturnType<typeof getSystemDockerContainers>>['data'][0];

// --- Hooks ---
function useContainers() {
  return useQuery({
    queryKey: ['containers'],
    queryFn: async () => {
      const res = await getSystemDockerContainers();
      if (res.error) throw res.error;
      return res.data || [];
    },
    refetchInterval: 3000, // Real-time polling
  });
}

function useContainerLogs(id: string | null) {
  return useQuery({
    queryKey: ['containers', id, 'logs'],
    queryFn: async () => {
      if (!id) return null;
      const res = await getSystemDockerContainerLogs({ path: { id } });
      if (res.error) throw res.error;
      return res.data;
    },
    refetchInterval: 2000,
    enabled: !!id,
  });
}

// --- Components ---

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <View className={`bg-white/5 border border-white/5 border-t-white/10 shadow-xl shadow-black/50 rounded-2xl p-5 ${className}`}>
    {children}
  </View>
);

const SkeletonRow = () => (
  <GlassCard className="mb-4 opacity-40">
    <View className="flex-row justify-between items-center mb-3">
      <View className="h-4 w-1/3 bg-white/10 rounded-md" />
      <View className="h-4 w-16 bg-white/10 rounded-full" />
    </View>
    <View className="space-y-2 mb-4">
      <View className="h-2 w-1/2 bg-white/5 rounded" />
      <View className="h-2 w-2/3 bg-white/5 rounded mt-2" />
    </View>
    <View className="flex-row justify-end gap-3 border-t border-white/5 pt-4 mt-2">
      <View className="h-8 w-8 bg-white/10 rounded-lg" />
      <View className="h-8 w-8 bg-white/10 rounded-lg" />
      <View className="h-8 w-8 bg-white/10 rounded-lg" />
    </View>
  </GlassCard>
);

const IconButton = ({ icon: IconComponent, color, onPress }: any) => (
  <Pressable 
    onPress={onPress}
    hitSlop={15}
    className="w-8 h-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 active:bg-white/10 shadow-sm shadow-black"
  >
    <IconComponent size={14} color={color} />
  </Pressable>
);

const ContainerRow = React.memo(({ container, onAction, onLogs }: { container: DockerContainer, onAction: (id: string, name: string, action: 'start'|'stop'|'restart') => void, onLogs: (id: string) => void }) => {
  const isRunning = container.status === 'running';
  const statusColor = isRunning ? '#4ADE80' : container.status === 'exited' ? '#FB7185' : '#FBBF24';
  const statusBg = isRunning ? 'bg-[#4ADE80]/10 border-[#4ADE80]/30 shadow-[#4ADE80]/20' : 
                   container.status === 'exited' ? 'bg-[#FB7185]/10 border-[#FB7185]/30 shadow-[#FB7185]/20' : 
                   'bg-[#FBBF24]/10 border-[#FBBF24]/30 shadow-[#FBBF24]/20';

  return (
    <GlassCard className="mb-4">
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1 mr-3">
          <Text className="text-white font-bold text-base mb-1" numberOfLines={1}>{container.name}</Text>
          <Text className="text-zinc-500 text-[10px] uppercase tracking-widest">{container.image}</Text>
        </View>
        <View className={`px-2.5 py-1 rounded-full border shadow-sm ${statusBg}`}>
          <Text className="text-[9px] font-black uppercase tracking-[0.15em]" style={{ color: statusColor }}>
            {container.status}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between mb-4">
        <View className="flex-1">
          <Text className="text-zinc-500 text-[9px] uppercase tracking-widest mb-1 font-semibold">Uptime</Text>
          <Text className="text-zinc-300 text-xs font-medium">{container.uptime}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-zinc-500 text-[9px] uppercase tracking-widest mb-1 font-semibold">Ports</Text>
          <Text className="text-zinc-300 text-xs font-mono">{container.ports}</Text>
        </View>
      </View>

      <View className="flex-row justify-end gap-3 border-t border-white/5 pt-4 mt-1">
        {isRunning ? (
          <>
            <IconButton icon={RotateCw} color="#A1A1AA" onPress={() => onAction(container.id, container.name, 'restart')} />
            <IconButton icon={Square} color="#FB7185" onPress={() => onAction(container.id, container.name, 'stop')} />
          </>
        ) : (
          <IconButton icon={Play} color="#4ADE80" onPress={() => onAction(container.id, container.name, 'start')} />
        )}
        <IconButton icon={Terminal} color="#2DD4BF" onPress={() => onLogs(container.id)} />
      </View>
    </GlassCard>
  );
});

export default function DockerScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);
  
  const { data: containers, isLoading, isError, refetch } = useContainers();
  
  const [search, setSearch] = useState('');
  const [filterRunning, setFilterRunning] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [activeLogContainer, setActiveLogContainer] = useState<string | null>(null);

  const { data: logsData, isLoading: isLogsLoading } = useContainerLogs(activeLogContainer);

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string, action: 'start'|'stop'|'restart' }) => {
      const res = await executeDockerContainerAction({ path: { id }, body: { action } });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
    onError: (err) => {
      showToast(`Action failed: ${err}`, 'error');
    }
  });

  const handleAction = (id: string, name: string, action: 'start'|'stop'|'restart') => {
    showToast(`Executing ${action} on ${name}...`, 'success');
    actionMutation.mutate({ id, action });
  };

  const filteredContainers = useMemo(() => {
    if (!containers) return [];
    return containers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filterRunning ? c.status === 'running' : true;
      return matchesSearch && matchesFilter;
    });
  }, [containers, search, filterRunning]);

  return (
    <OfflineGate>
      <View className="flex-1 bg-[#09090B]">
        {/* Header Search & Filter */}
        <View 
          className="px-4 pb-4 border-b border-white/5 bg-black/40 z-10" 
          style={{ paddingTop: insets.top + (Platform.OS === 'android' ? 60 : 70) }}
        >
          <View className="flex-row gap-3">
            <View className="flex-1 flex-row items-center bg-white/5 border border-white/5 border-t-white/10 rounded-xl px-3 h-11 shadow-inner shadow-black">
            <Search size={16} color="#71717A" />
            <TextInput
              className="flex-1 text-white text-sm ml-2 h-full"
              placeholder="Search containers..."
              placeholderTextColor="#71717A"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <View className="relative z-20">
            <Pressable 
              onPress={() => setFilterModalVisible(!isFilterModalVisible)}
              className={`w-11 h-11 items-center justify-center rounded-xl border shadow-lg ${
                filterRunning || isFilterModalVisible ? 'bg-[#2DD4BF]/20 border-[#2DD4BF]/40 shadow-[#2DD4BF]/20' : 'bg-white/5 border-white/5 border-t-white/10 shadow-black'
              }`}
            >
              <Filter size={16} color={filterRunning || isFilterModalVisible ? "#2DD4BF" : "#A1A1AA"} />
            </Pressable>
            {isFilterModalVisible && (
              <View className="absolute top-14 right-0 w-52 bg-[#18181B] border border-white/10 rounded-xl shadow-2xl shadow-black overflow-hidden z-50 py-1">
                <Pressable 
                  className={`flex-row items-center px-4 py-3 border-b border-white/5 ${!filterRunning ? 'bg-[#2DD4BF]/10' : 'active:bg-white/5'}`}
                  onPress={() => {
                    setFilterRunning(false);
                    setFilterModalVisible(false);
                  }}
                >
                  <View className={`w-2 h-2 rounded-full mr-3 ${!filterRunning ? 'bg-[#2DD4BF]' : 'bg-transparent'}`} />
                  <Text className={`flex-1 text-sm ${!filterRunning ? 'text-[#2DD4BF] font-bold' : 'text-white'}`}>All Containers</Text>
                  {!filterRunning && <CheckCircle size={14} color="#2DD4BF" />}
                </Pressable>
                <Pressable 
                  className={`flex-row items-center px-4 py-3 ${filterRunning ? 'bg-[#2DD4BF]/10' : 'active:bg-white/5'}`}
                  onPress={() => {
                    setFilterRunning(true);
                    setFilterModalVisible(false);
                  }}
                >
                  <View className={`w-2 h-2 rounded-full mr-3 ${filterRunning ? 'bg-[#2DD4BF]' : 'bg-transparent'}`} />
                  <Text className={`flex-1 text-sm ${filterRunning ? 'text-[#2DD4BF] font-bold' : 'text-white'}`}>Running Only</Text>
                  {filterRunning && <CheckCircle size={14} color="#2DD4BF" />}
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Main List */}
      <View className="flex-1 px-4 pt-4">
        {isLoading ? (
          <View>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : isError ? (
          <View className="flex-1 items-center justify-center pb-20">
            <AlertCircle size={48} color="#FB7185" className="mb-4 opacity-80" />
            <Text className="text-white text-lg font-bold mb-2">Failed to load</Text>
            <Pressable 
              onPress={() => refetch()} 
              className="bg-white/10 px-4 py-2 rounded-lg border border-white/20 active:bg-white/20 mt-2"
            >
              <Text className="text-zinc-300 font-semibold text-xs uppercase tracking-widest">Retry</Text>
            </Pressable>
          </View>
        ) : filteredContainers.length === 0 ? (
          <View className="flex-1 items-center justify-center pb-20 opacity-50">
            <Box size={48} color="#71717A" className="mb-4" />
            <Text className="text-zinc-400 text-sm font-medium">No containers found.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredContainers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ContainerRow container={item} onAction={handleAction} onLogs={setActiveLogContainer} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
          />
        )}
      </View>

      {/* Live Logs Overlay */}
      {activeLogContainer && (
        <View className="absolute inset-0 bg-[#09090B]/95 z-50 p-4" style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}>
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-1 mr-4">
              <Text className="text-white font-bold text-xl" numberOfLines={1}>
                {containers?.find(c => c.id === activeLogContainer)?.name || 'Logs'}
              </Text>
              <Text className="text-[#2DD4BF] text-xs font-mono mt-1">Live Streaming</Text>
            </View>
            <Pressable 
              onPress={() => setActiveLogContainer(null)}
              className="w-10 h-10 items-center justify-center bg-white/10 rounded-full border border-white/20"
            >
              <X size={20} color="#fff" />
            </Pressable>
          </View>

          <View className="flex-1 bg-black rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black">
            {isLogsLoading && !logsData ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-zinc-500 font-mono text-xs">Fetching logs...</Text>
              </View>
            ) : (
              <ScrollView 
                className="flex-1 p-4" 
                contentContainerStyle={{ paddingBottom: 40 }}
                ref={(ref) => {
                  // Auto-scroll to bottom on update
                  setTimeout(() => ref?.scrollToEnd({ animated: true }), 100);
                }}
              >
                {logsData?.logs?.map((line, idx) => (
                  <Text key={idx} className="text-[#A1A1AA] font-mono text-[10px] leading-4 mb-1">{line}</Text>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}
    </View>
    </OfflineGate>
  );
}
