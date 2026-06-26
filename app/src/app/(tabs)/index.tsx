import { View, Text, ScrollView, Platform, Pressable, RefreshControl } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { CartesianChart, Line } from 'victory-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import Svg, { Path as SvgPath, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useUIStore } from '../../store/useUIStore';
import { OfflineGate } from '../../components/OfflineGate';
import { withBiometricAuth } from '../../utils/biometrics';
import { Skeleton } from '../../components/Skeleton';

import { useQuery } from '@tanstack/react-query';
import { getSystemMetricsOptions } from '../../generated/api/@tanstack/react-query.gen';
import { getSystemMacros, executeSystemMacro, executeSystemCommand } from '../../generated/api';

// Helper for Skia Gauge
function GaugeChart({ percentage }: { percentage: number }) {
  if (Platform.OS === 'web') {
    const size = 96;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const perimeter = 2 * Math.PI * radius;
    const arcLength = perimeter * 0.75;

    return (
      <View className="items-center justify-center relative w-24 h-24">
        <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '135deg' }] }}>
          <Circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} strokeLinecap="round" fill="none" strokeDasharray={`${arcLength} ${perimeter}`} />
          <Circle cx={size/2} cy={size/2} r={radius} stroke="#2DD4BF" strokeWidth={strokeWidth} strokeLinecap="round" fill="none" strokeDasharray={`${arcLength * (percentage / 100)} ${perimeter}`} />
        </Svg>
        <View className="items-center justify-center absolute mt-2">
          <Text className="text-white font-black text-3xl">{percentage}<Text className="text-lg">%</Text></Text>
          <Text className="text-zinc-500 text-[9px] uppercase tracking-[0.2em] mt-1 font-semibold">Used</Text>
        </View>
      </View>
    );
  }

  const size = 96;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  
  const backgroundPath = Skia.Path.Make();
  backgroundPath.addArc({ x: strokeWidth/2, y: strokeWidth/2, width: size - strokeWidth, height: size - strokeWidth }, 135, 270);
  
  const foregroundPath = Skia.Path.Make();
  foregroundPath.addArc({ x: strokeWidth/2, y: strokeWidth/2, width: size - strokeWidth, height: size - strokeWidth }, 135, 270 * (percentage / 100));

  return (
    <View className="items-center justify-center relative w-24 h-24">
      <Canvas style={{ width: size, height: size, position: 'absolute' }}>
        <Path path={backgroundPath} color="rgba(255,255,255,0.05)" style="stroke" strokeWidth={strokeWidth} strokeCap="round" />
        <Path path={foregroundPath} color="#2DD4BF" style="stroke" strokeWidth={strokeWidth} strokeCap="round" />
      </Canvas>
      <View className="items-center justify-center absolute mt-2">
        <Text className="text-white font-black text-3xl">{percentage}<Text className="text-lg">%</Text></Text>
        <Text className="text-zinc-500 text-[9px] uppercase tracking-[0.2em] mt-1 font-semibold">Used</Text>
      </View>
    </View>
  );
}

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <View className={`bg-white/5 border border-white/5 border-t-white/20 shadow-2xl shadow-black/50 rounded-3xl p-5 ${className}`}>
    {children}
  </View>
);

const SectionHeader = ({ title, icon, className = "mb-4" }: { title: string, icon?: any, className?: string }) => (
  <View className={`flex-row items-center ${className}`}>
    {icon && <Feather name={icon} size={14} color="#A1A1AA" className="mr-2 flex-shrink-0" />}
    <Text className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold flex-shrink" numberOfLines={1}>{title}</Text>
  </View>
);

const StatusChip = ({ status, type }: { status: string, type: 'success' | 'warning' | 'critical' }) => {
  const styles = {
    success: "bg-[#2DD4BF]/20 border-[#2DD4BF]/40 text-[#2DD4BF] shadow-[#2DD4BF]/20",
    warning: "bg-[#FBBF24]/20 border-[#FBBF24]/40 text-[#FBBF24] shadow-[#FBBF24]/20",
    critical: "bg-[#FB7185]/20 border-[#FB7185]/40 text-[#FB7185] shadow-[#FB7185]/20",
  };
  
  const extractedColors = styles[type].split(' ');
  const bgClass = extractedColors[0];
  const borderClass = extractedColors[1];
  const textClass = extractedColors[2];
  const shadowClass = extractedColors[3];

  return (
    <View className={`px-2.5 py-1 rounded-full border shadow-sm ${bgClass} ${borderClass} ${shadowClass}`}>
      <Text className={`text-[9px] font-black uppercase tracking-[0.15em] ${textClass}`}>
        {status}
      </Text>
    </View>
  );
};

export default function StatsScreen() {
  const router = useRouter();
  const { showToast, isDataLoading, setDataLoading } = useUIStore();

  const { data: metrics, isLoading, isError, refetch } = useQuery({
    ...getSystemMetricsOptions(),
    refetchInterval: 2000
  });

  const { data: macros } = useQuery({
    queryKey: ['macros'],
    queryFn: async () => {
      const res = await getSystemMacros();
      if (res.error) throw res.error;
      return res.data || [];
    }
  });

  const [cpuHistory, setCpuHistory] = useState(Array.from({ length: 30 }, (_, i) => ({ x: i, c1: 0 })));

  useEffect(() => {
    if (metrics) {
      setCpuHistory(prev => {
        const next = [...prev.slice(1), { x: prev[prev.length - 1].x + 1, c1: metrics.cpu.usage }];
        return next;
      });
    }
  }, [metrics]);

  const onRefresh = () => {
    setDataLoading(true);
    refetch().finally(() => {
      setDataLoading(false);
    });
  };

  const loading = isDataLoading || isLoading;

  return (
    <OfflineGate>
      <View className="flex-1 bg-[#09090B]">
      <ScrollView 
        className="flex-1 px-4" 
        contentContainerStyle={{ paddingTop: 70, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl 
            refreshing={false} // We don't use standard spinning loader, we just use our skeleton
            onRefresh={onRefresh}
            tintColor="transparent" // Hide default spinner
          />
        }
      >
        
        {/* ROW 1: CPU FULL WIDTH */}
        <Card className="mb-3">
          <View className="flex-row justify-between items-center mb-2">
            <SectionHeader title="CPU Usage" icon="cpu" className="flex-1 mr-2" />
            <View className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 border-t-white/20 shadow-lg shadow-black">
              {loading ? <Skeleton width={40} height={24} borderRadius={4} /> : <Text className="text-white font-black text-lg">{metrics ? metrics.cpu.usage.toFixed(0) : 0}%</Text>}
            </View>
          </View>
          
          <View className="h-32 w-full my-3">
            {loading && !metrics ? (
              <Skeleton width="100%" height="100%" borderRadius={16} />
            ) : Platform.OS === 'web' ? (
              <View className="flex-1 w-full h-full">
                <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <SvgPath d="M 0 25 L 100 25" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
                  <SvgPath d="M 0 50 L 100 50" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
                  <SvgPath d="M 0 75 L 100 75" stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
                  <SvgPath 
                    d={`${cpuHistory.map((d, i) => `${i === 0 ? 'M' : 'L'} ${(i / (cpuHistory.length - 1)) * 100} ${100 - d.c1}`).join(' ')} L 100 100 L 0 100 Z`} 
                    fill="rgba(59, 130, 246, 0.2)" 
                  />
                  <SvgPath 
                    d={cpuHistory.map((d, i) => `${i === 0 ? 'M' : 'L'} ${(i / (cpuHistory.length - 1)) * 100} ${100 - d.c1}`).join(' ')} 
                    stroke="#3B82F6" strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" 
                  />
                </Svg>
              </View>
            ) : (
              <CartesianChart data={cpuHistory} xKey="x" yKeys={["c1"]} padding={0} domain={{ y: [0, 100] }}>
                {({ points }) => (
                  <>
                    <Line points={points.c1} color="#3B82F6" strokeWidth={2.5} curveType="monotoneX" />
                  </>
                )}
              </CartesianChart>
            )}
          </View>
          
          <View className="flex-col sm:flex-row justify-between mt-4 gap-3">
            {loading ? <Skeleton width={150} height={16} /> : <Text className="text-zinc-400 text-xs font-semibold">{metrics ? `${metrics.cpu.cores}-Core Processor` : 'Unknown Processor'}</Text>}
            <View className="flex-row items-center">
              {loading ? (
                 <Skeleton width={100} height={20} borderRadius={10} />
              ) : (
                <>
                  <Text className="text-zinc-500 text-[10px] uppercase tracking-wider mr-3 font-semibold">Freq: {metrics ? (metrics.cpu.frequency / 1000).toFixed(2) : 0} GHz  |  Lead:</Text>
                  <StatusChip status={metrics && metrics.cpu.usage > 80 ? "High" : "Normal"} type={metrics && metrics.cpu.usage > 80 ? "critical" : "success"} />
                </>
              )}
            </View>
          </View>
        </Card>

        {/* ROW 2: RAM & Server */}
        <View className="flex-row gap-3 mb-3">
          <Card className="flex-[2]">
            <SectionHeader title="Memory" icon="hard-drive" />
            <View className="flex-col xl:flex-row items-center justify-center mt-3 mb-1">
              {loading ? <Skeleton width={96} height={96} borderRadius={48} /> : <GaugeChart percentage={metrics ? Math.round(metrics.memory.usagePercent) : 0} />}
              <View className="w-full mt-6 xl:mt-0 xl:ml-6 gap-3">
                <View className="flex-row justify-between items-baseline">
                  <Text className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold">Available</Text>
                  {loading ? <Skeleton width={30} height={16} /> : <Text className="text-white font-bold text-sm">{metrics ? (metrics.memory.free / (1024*1024*1024)).toFixed(1) : 0}<Text className="text-zinc-400 text-[10px]">GB</Text></Text>}
                </View>
                <View className="flex-row justify-between items-baseline">
                  <Text className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold">Total</Text>
                  {loading ? <Skeleton width={30} height={16} /> : <Text className="text-white font-bold text-sm">{metrics ? (metrics.memory.total / (1024*1024*1024)).toFixed(0) : 0}<Text className="text-zinc-400 text-[10px]">GB</Text></Text>}
                </View>
                <View className="flex-row justify-between items-baseline">
                  <Text className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold">Cached</Text>
                  {isDataLoading ? <Skeleton width={30} height={16} /> : <Text className="text-white font-bold text-sm">14<Text className="text-zinc-400 text-[10px]">GB</Text></Text>}
                </View>
              </View>
            </View>
          </Card>

          <View className="flex-[1] justify-between gap-3">
            <Card className="flex-1 justify-center items-center py-4 px-2">
              <Feather name="database" size={24} color="#2DD4BF" className="mb-3 drop-shadow-md" />
              <Text className="text-white font-bold text-sm mb-3">Server</Text>
              {isLoading ? <Skeleton width={60} height={20} borderRadius={10} /> : <StatusChip status={isError ? "Offline" : "Online"} type={isError ? "critical" : "success"} />}
            </Card>
            <Pressable 
              className="flex-1 active:opacity-50"
              onPress={async () => {
                if (!metrics?.containers?.running) {
                  showToast('Starting Docker Daemon...', 'success');
                  try {
                    await executeSystemCommand({ body: { command: 'open -a Docker' } });
                    setTimeout(() => refetch(), 3000);
                  } catch (err: any) {
                    showToast(`Failed to start Docker: ${err.message}`, 'error');
                  }
                }
              }}
            >
              <Card className="flex-1 justify-center items-center py-4 px-2 pointer-events-none">
                <FontAwesome5 name="docker" size={24} color="#2DD4BF" className="mb-3 drop-shadow-md" />
                <Text className="text-white font-bold text-sm mb-3">Docker</Text>
                {loading ? <Skeleton width={60} height={20} borderRadius={10} /> : <StatusChip status={metrics?.containers?.running ? "Running" : "Stopped"} type={metrics?.containers?.running ? "success" : "warning"} />}
              </Card>
            </Pressable>
          </View>
        </View>

        {/* ROW 3: CONTAINERS & POWER */}
        <View className="flex-row gap-3 mb-3">
          <Card className="flex-[5] flex-col justify-between">
            <SectionHeader title="Containers" icon="layers" className="mb-3" />
            <View className="flex-row flex-wrap justify-between gap-y-3 mt-1">
              {/* Active */}
              <View className="w-[47%] aspect-square bg-black/20 rounded-2xl border border-white/5 flex-col items-center justify-center">
                {loading ? <Skeleton width={30} height={30} className="mb-1" /> : <Text className="text-[#4ADE80] font-black text-3xl mb-1 drop-shadow-md">{metrics?.containers?.active ?? 0}</Text>}
                <Text className="text-zinc-500 text-[9px] uppercase tracking-[0.2em] font-bold">Active</Text>
              </View>
              
              {/* Warning */}
              <View className="w-[47%] aspect-square bg-black/20 rounded-2xl border border-white/5 flex-col items-center justify-center">
                {loading ? <Skeleton width={20} height={30} className="mb-1" /> : <Text className="text-[#FBBF24] font-black text-3xl mb-1 drop-shadow-md">{metrics?.containers?.warning ?? 0}</Text>}
                <Text className="text-zinc-500 text-[9px] uppercase tracking-[0.2em] font-bold">Warn</Text>
              </View>
              
              {/* Exited */}
              <View className="w-[47%] aspect-square bg-black/20 rounded-2xl border border-white/5 flex-col items-center justify-center">
                {loading ? <Skeleton width={20} height={30} className="mb-1" /> : <Text className="text-[#FB7185] font-black text-3xl mb-1 drop-shadow-md">{metrics?.containers?.exited ?? 0}</Text>}
                <Text className="text-zinc-500 text-[9px] uppercase tracking-[0.2em] font-bold">Exit</Text>
              </View>
              
              {/* Action */}
              <Pressable 
                onPress={() => router.push('/docker')}
                className="w-[47%] aspect-square bg-white/5 rounded-2xl border border-white/5 border-t-white/20 flex-col items-center justify-center shadow-lg shadow-black active:bg-white/10"
              >
                <Feather name="arrow-up-right" size={24} color="#2DD4BF" className="mb-2" />
                <Text className="text-[#2DD4BF] text-[9px] uppercase tracking-[0.2em] font-bold">Manage</Text>
              </Pressable>
            </View>
          </Card>

          <Card className="flex-[4] flex-col justify-between">
            <View className="flex-col mb-5">
              <SectionHeader title="Server Power" icon="zap" className="mb-3" />
              <View className="self-start bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 border-t-white/20 shadow-lg shadow-black">
                 {loading ? <Skeleton width={50} height={24} /> : <Text className="text-white font-black text-xl">{metrics?.power?.watts ?? 0}<Text className="text-zinc-400 text-xs">W</Text></Text>}
              </View>
            </View>
            
            <View className="flex-row gap-2 h-32">
              <View className="flex-1 bg-[#2DD4BF]/5 border border-white/5 border-t-white/10 rounded-2xl p-2 flex-col items-center justify-center relative overflow-hidden">
                <View className="absolute left-0 right-0 bottom-0 bg-[#2DD4BF]/20 h-[70%]" />
                <Feather name="zap" size={20} color="#2DD4BF" className="mb-2 relative z-10" />
                {loading ? <Skeleton width={30} height={20} className="relative z-10" /> : <Text className="text-white text-lg font-black relative z-10">{metrics ? Math.round((metrics?.power?.watts ?? 0) * 0.75) : 0}<Text className="text-xs">W</Text></Text>}
                <Text className="text-[#2DD4BF] text-[9px] uppercase tracking-[0.2em] relative z-10 mt-1 font-bold">Active</Text>
              </View>

              <View className="flex-1 bg-white/5 border border-white/5 border-t-white/10 rounded-2xl p-2 flex-col items-center justify-center relative overflow-hidden">
                <View className="absolute left-0 right-0 bottom-0 bg-white/10 h-[20%]" />
                <Feather name="moon" size={20} color="#A1A1AA" className="mb-2 relative z-10" />
                {loading ? <Skeleton width={30} height={20} className="relative z-10" /> : <Text className="text-zinc-300 text-lg font-black relative z-10">{metrics ? Math.round((metrics?.power?.watts ?? 0) * 0.25) : 0}<Text className="text-xs">W</Text></Text>}
                <Text className="text-zinc-500 text-[9px] uppercase tracking-[0.2em] relative z-10 mt-1 font-bold">Idle</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* ROW 4: NETWORK/STORAGE & MACROS */}
        <View className="flex-row gap-3">
          <View className="flex-1 flex-col gap-3">
            {/* NETWORK I/O */}
            <Card className="flex-1 justify-center px-4 py-4">
              <SectionHeader title="Network I/O" icon="activity" className="mb-3" />
              
              <View className="mb-3">
                <View className="flex-row justify-between items-end mb-1.5">
                  <View className="flex-row items-center">
                    <Feather name="arrow-down" size={12} color="#4ADE80" className="mr-1.5" />
                    <Text className="text-zinc-400 text-[10px] uppercase font-bold">Down</Text>
                  </View>
                  {loading ? <Skeleton width={40} height={12} /> : <Text className="text-white font-bold text-xs">{metrics?.network ? metrics.network.downMbps.toFixed(1) : 0} MB/s</Text>}
                </View>
                <View className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  {!loading && <View className="h-full bg-[#4ADE80]" style={{ width: metrics?.network ? `${Math.min(100, (metrics.network.downMbps/100)*100)}%` : '0%' }} />}
                </View>
              </View>

              <View>
                <View className="flex-row justify-between items-end mb-1.5">
                  <View className="flex-row items-center">
                    <Feather name="arrow-up" size={12} color="#2DD4BF" className="mr-1.5" />
                    <Text className="text-zinc-400 text-[10px] uppercase font-bold">Up</Text>
                  </View>
                  {loading ? <Skeleton width={40} height={12} /> : <Text className="text-white font-bold text-xs">{metrics?.network ? metrics.network.upMbps.toFixed(1) : 0} MB/s</Text>}
                </View>
                <View className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  {!loading && <View className="h-full bg-[#2DD4BF]" style={{ width: metrics?.network ? `${Math.min(100, (metrics.network.upMbps/100)*100)}%` : '0%' }} />}
                </View>
              </View>
            </Card>

            {/* STORAGE */}
            <Card className="flex-1 justify-center px-4 py-4">
              <SectionHeader title="Storage" icon="hard-drive" className="mb-3" />
              
              <View className="mb-3">
                <View className="flex-row justify-between items-end mb-1.5">
                  <Text className="text-zinc-300 text-[10px] font-bold">Primary Disk <Text className="text-zinc-500 font-normal">(/)</Text></Text>
                  {loading ? <Skeleton width={20} height={12} /> : <Text className="text-white font-bold text-xs">{metrics ? Math.round(metrics.disk.usagePercent) : 0}%</Text>}
                </View>
                <View className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  {!loading && <View className="h-full bg-[#4ADE80]" style={{ width: `${metrics ? Math.round(metrics.disk.usagePercent) : 0}%` }} />}
                </View>
                {/* Total and Free text info */}
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="text-zinc-500 text-[9px] uppercase font-bold tracking-widest">Free: {metrics ? (metrics.disk.free / (1024*1024*1024)).toFixed(1) : 0} GB</Text>
                  <Text className="text-zinc-500 text-[9px] uppercase font-bold tracking-widest">Total: {metrics ? (metrics.disk.total / (1024*1024*1024)).toFixed(0) : 0} GB</Text>
                </View>
              </View>
            </Card>
          </View>

          <Card className="flex-1">
            <SectionHeader title="SSH Macros" icon="command" />
            <View className="mt-3">
              {!macros ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <View key={i} className="flex-row items-center justify-between py-2 border-b border-white/5 last:border-b-0">
                    <Skeleton width={100} height={16} />
                    <Skeleton width={16} height={16} borderRadius={8} />
                  </View>
                ))
              ) : macros.length === 0 ? (
                <Text className="text-zinc-500 text-xs italic text-center py-4">No macros configured.</Text>
              ) : (
                macros.slice(0, 5).map((macro) => (
                  <Pressable 
                    key={macro.id} 
                    onPress={() => {
                      const action = async () => {
                        showToast(`Executing ${macro.name}...`, 'success');
                        try {
                          await executeSystemMacro({ path: { id: macro.id || '' } });
                          showToast(`Executed ${macro.name} successfully`, 'success');
                        } catch (err: any) {
                          showToast(`Failed: ${err.message}`, 'error');
                        }
                      };
                      if (macro.isDangerous) {
                        withBiometricAuth(action);
                      } else {
                        action();
                      }
                    }}
                    className="flex-row items-center justify-between py-2 border-b border-white/5 last:border-b-0 active:opacity-50"
                  >
                    <View className="flex-1 mr-2">
                       <Text className="text-zinc-300 text-xs font-semibold" numberOfLines={1}>{macro.name}</Text>
                       {macro.isDangerous && <Text className="text-[#EF4444] text-[8px] uppercase font-bold mt-0.5">Dangerous</Text>}
                    </View>
                    <Feather name="play-circle" size={16} color={macro.isDangerous ? "#EF4444" : "#4ade80"} />
                  </Pressable>
                ))
              )}
            </View>
          </Card>
        </View>

      </ScrollView>
    </View>
    </OfflineGate>
  );
}
