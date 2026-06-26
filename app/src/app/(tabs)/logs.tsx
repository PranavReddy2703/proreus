import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Pause, Terminal, Filter, Search, Copy, CheckCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '../../store/useUIStore';
import { OfflineGate } from '../../components/OfflineGate';
import { getSystemLogs } from '../../generated/api';

type SystemLogEntry = Awaited<ReturnType<typeof getSystemLogs>>['data'][0];

function useLogsStream(isPaused: boolean) {
  const { data } = useQuery({
    queryKey: ['system', 'logs'],
    queryFn: async () => {
      const res = await getSystemLogs();
      if (res.error) throw res.error;
      return res.data || [];
    },
    refetchInterval: isPaused ? false : 3000,
  });

  return data || [];
}

const LogLine = React.memo(({ log, onCopy }: { log: SystemLogEntry, onCopy: (text: string) => void }) => {
  const levelColors: Record<string, string> = {
    INFO: '#4ADE80',
    WARN: '#FBBF24',
    ERROR: '#FB7185',
  };
  const color = levelColors[log.level] || '#A1A1AA';

  return (
    <Pressable 
      onLongPress={() => onCopy(`[${log.timestamp}] [${log.level}] [${log.service}] ${log.message}`)}
      className="flex-row items-start mb-1.5 active:bg-white/10 rounded px-1 -mx-1"
      delayLongPress={300}
    >
      <Text className="text-zinc-500 font-mono text-[10px] mr-2">[{log.timestamp}]</Text>
      <Text className="font-mono text-[10px] mr-2 w-10 font-black tracking-widest" style={{ color }}>{log.level}</Text>
      <Text className="text-zinc-400 font-mono text-[10px] mr-2 w-24" numberOfLines={1}>[{log.service}]</Text>
      <Text className="text-zinc-300 font-mono text-xs flex-1 leading-tight">{log.message}</Text>
    </Pressable>
  );
});

export default function LogsScreen() {
  const insets = useSafeAreaInsets();
  const showToast = useUIStore((state) => state.showToast);
  
  const [search, setSearch] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  const logs = useLogsStream(isPaused);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = search === '' || 
        log.message.toLowerCase().includes(search.toLowerCase()) || 
        log.service.toLowerCase().includes(search.toLowerCase());
      
      const matchesLevel = levelFilter === null || log.level === levelFilter;
      
      return matchesSearch && matchesLevel;
    });
  }, [logs, search, levelFilter]);

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showToast('Log entry copied to clipboard', 'success');
  };

  const handleCopyAll = async () => {
    const text = filteredLogs.map(l => `[${l.timestamp}] [${l.level}] [${l.service}] ${l.message}`).join('\n');
    await Clipboard.setStringAsync(text);
    showToast(`Copied ${filteredLogs.length} logs`, 'success');
  };

  const currentCount = filteredLogs.length;

  return (
    <OfflineGate>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-[#09090B]"
      >
        {/* Header & Controls */}
        <View 
          className="px-4 pb-4 border-b border-white/5 bg-black/40 z-10" 
          style={{ paddingTop: insets.top + (Platform.OS === 'android' ? 60 : 70) }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Terminal color="#A1A1AA" size={16} className="mr-2" />
              <Text className="text-white font-bold text-lg">System Output</Text>
              <View className="bg-white/10 px-2 py-0.5 rounded-full ml-3">
                <Text className="text-zinc-400 text-[10px] font-mono">{currentCount} lines</Text>
              </View>
            </View>
            <View className="flex-row gap-3">
              <Pressable 
                onPress={handleCopyAll}
                className="w-8 h-8 items-center justify-center bg-white/5 rounded-lg border border-white/5 active:bg-white/10"
              >
                <Copy size={14} color="#A1A1AA" />
              </Pressable>
              <Pressable 
                onPress={() => setIsPaused(!isPaused)}
                className={`w-8 h-8 items-center justify-center rounded-lg border active:bg-white/10 ${
                  isPaused ? 'bg-[#FBBF24]/20 border-[#FBBF24]/40' : 'bg-[#4ADE80]/20 border-[#4ADE80]/40'
                }`}
              >
                {isPaused ? <Play size={14} color="#FBBF24" fill="#FBBF24" /> : <Pause size={14} color="#4ADE80" fill="#4ADE80" />}
              </Pressable>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 flex-row items-center bg-white/5 border border-white/5 border-t-white/10 rounded-xl px-3 h-11 shadow-inner shadow-black">
              <Search size={16} color="#71717A" />
              <TextInput
                className="flex-1 text-white text-sm ml-2 h-full"
                placeholder="grep logs..."
                placeholderTextColor="#71717A"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View className="relative z-20">
              <Pressable 
                onPress={() => setFilterModalVisible(!isFilterModalVisible)}
                className={`w-11 h-11 items-center justify-center rounded-xl border shadow-lg ${
                  levelFilter || isFilterModalVisible ? 'bg-[#2DD4BF]/20 border-[#2DD4BF]/40 shadow-[#2DD4BF]/20' : 'bg-white/5 border-white/5 border-t-white/10 shadow-black'
                }`}
              >
                <Filter size={16} color={levelFilter || isFilterModalVisible ? "#2DD4BF" : "#A1A1AA"} />
              </Pressable>
              
              {isFilterModalVisible && (
                <View className="absolute top-14 right-0 w-48 bg-[#18181B] border border-white/10 rounded-xl shadow-2xl shadow-black overflow-hidden z-50 py-1">
                  <Pressable 
                    className={`flex-row items-center px-4 py-3 border-b border-white/5 ${levelFilter === null ? 'bg-[#2DD4BF]/10' : 'active:bg-white/5'}`}
                    onPress={() => { setLevelFilter(null); setFilterModalVisible(false); }}
                  >
                    <Text className={`flex-1 text-sm ${levelFilter === null ? 'text-[#2DD4BF] font-bold' : 'text-white'}`}>All Levels</Text>
                    {levelFilter === null && <CheckCircle size={14} color="#2DD4BF" />}
                  </Pressable>
                  <Pressable 
                    className={`flex-row items-center px-4 py-3 border-b border-white/5 ${levelFilter === 'ERROR' ? 'bg-[#FB7185]/10' : 'active:bg-white/5'}`}
                    onPress={() => { setLevelFilter('ERROR'); setFilterModalVisible(false); }}
                  >
                    <View className="w-2 h-2 rounded-full bg-[#FB7185] mr-3" />
                    <Text className={`flex-1 text-sm ${levelFilter === 'ERROR' ? 'text-[#FB7185] font-bold' : 'text-white'}`}>Errors</Text>
                    {levelFilter === 'ERROR' && <CheckCircle size={14} color="#FB7185" />}
                  </Pressable>
                  <Pressable 
                    className={`flex-row items-center px-4 py-3 border-b border-white/5 ${levelFilter === 'WARN' ? 'bg-[#FBBF24]/10' : 'active:bg-white/5'}`}
                    onPress={() => { setLevelFilter('WARN'); setFilterModalVisible(false); }}
                  >
                    <View className="w-2 h-2 rounded-full bg-[#FBBF24] mr-3" />
                    <Text className={`flex-1 text-sm ${levelFilter === 'WARN' ? 'text-[#FBBF24] font-bold' : 'text-white'}`}>Warnings</Text>
                    {levelFilter === 'WARN' && <CheckCircle size={14} color="#FBBF24" />}
                  </Pressable>
                  <Pressable 
                    className={`flex-row items-center px-4 py-3 ${levelFilter === 'INFO' ? 'bg-[#4ADE80]/10' : 'active:bg-white/5'}`}
                    onPress={() => { setLevelFilter('INFO'); setFilterModalVisible(false); }}
                  >
                    <View className="w-2 h-2 rounded-full bg-[#4ADE80] mr-3" />
                    <Text className={`flex-1 text-sm ${levelFilter === 'INFO' ? 'text-[#4ADE80] font-bold' : 'text-white'}`}>Info</Text>
                    {levelFilter === 'INFO' && <CheckCircle size={14} color="#4ADE80" />}
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Logs Feed */}
        <View className="flex-1 bg-black">
          <FlatList
            data={filteredLogs}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <LogLine log={item} onCopy={handleCopy} />}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={true}
            // Inverted layout trick to keep scroll at bottom
            inverted={false}
            ref={(ref) => {
              if (ref && !isPaused && filteredLogs.length > 0) {
                // simple auto-scroll mechanism
                setTimeout(() => ref.scrollToEnd({ animated: true }), 100);
              }
            }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center pt-20">
                <Terminal size={32} color="#3F3F46" className="mb-4" />
                <Text className="text-zinc-500 font-mono text-xs">No logs found matching criteria.</Text>
              </View>
            }
          />
          {isPaused && (
            <View className="absolute bottom-4 self-center bg-[#FBBF24]/20 border border-[#FBBF24]/30 px-4 py-2 rounded-full shadow-lg">
              <Text className="text-[#FBBF24] font-mono text-xs font-bold uppercase tracking-widest">Stream Paused</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </OfflineGate>
  );
}
