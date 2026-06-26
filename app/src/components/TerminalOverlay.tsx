import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, Keyboard, useWindowDimensions, Platform, TextInput } from 'react-native';
import { X, Trash2, Terminal as TerminalIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTerminalStore, TerminalLine } from '../store/useTerminalStore';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { executeSystemCommand } from '../generated/api';


const LineRenderer = React.memo(({ line }: { line: TerminalLine }) => {
  let textColorClass = 'text-[#A1A1AA]';
  let prefix = '';

  if (line.type === 'command') {
    textColorClass = 'text-[#2DD4BF]';
    prefix = 'root@proreus:~# ';
  } else if (line.type === 'error') {
    textColorClass = 'text-[#FB7185]';
  } else if (line.type === 'system') {
    textColorClass = 'text-zinc-500';
  }

  return (
    <View className="flex-row my-0.5 px-2">
      {prefix ? (
        <Text className="text-[#2DD4BF] font-mono text-[11px] opacity-80 leading-5">{prefix}</Text>
      ) : null}
      <Text className={`${textColorClass} font-mono text-[11px] leading-5 flex-1`} selectable>
        {line.text}
      </Text>
    </View>
  );
});

export const TerminalOverlay = () => {
  const { isOpen, lines, closeTerminal, clearTerminal, addLine } = useTerminalStore();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const scrollViewRef = useRef<any>(null);
  const [inputValue, setInputValue] = useState('');
  const [isAutoScrollLocked, setIsAutoScrollLocked] = useState(false);
  const { height } = useWindowDimensions();
  const headerHeight = insets.top + (Platform.OS === 'android' ? 60 : 70);
  const maxHeight = height - headerHeight;

  // Snap points for the bottom sheet
  const snapPoints = useMemo(() => ['30%', '50%', maxHeight], [maxHeight]);

  // Sync isOpen state with BottomSheet index
  useEffect(() => {
    if (isOpen) {
      // If it's opening for the first time or from a closed state, snap to 50%
      bottomSheetRef.current?.snapToIndex(1);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  // Smart Auto-scroll
  useEffect(() => {
    if (isOpen && !isAutoScrollLocked) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [lines, isOpen, isAutoScrollLocked]);

  const handleCommandSubmit = async () => {
    const cmd = inputValue.trim();
    if (!cmd) return;
    
    addLine(cmd, 'command');
    setInputValue('');
    setIsAutoScrollLocked(false);
    
    try {
      const res = await executeSystemCommand({ body: { command: cmd } });
      if (res.error) throw res.error;
      
      const { output, success } = res.data;
      if (output) {
        const outLines = output.trim().split('\n');
        outLines.forEach((l: string) => addLine(l, success ? 'output' : 'error'));
      }
      if (!success && !output) {
         addLine(`[ERROR] Execution failed.`, 'error');
      }
    } catch (err: any) {
      addLine(`[ERROR] Request failed: ${err.message || String(err)}`, 'error');
    }
  };

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;
    
    if (isAtBottom && isAutoScrollLocked) {
      setIsAutoScrollLocked(false);
    } else if (!isAtBottom && !isAutoScrollLocked) {
      setIsAutoScrollLocked(true);
    }
  }, [isAutoScrollLocked]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      closeTerminal();
      Keyboard.dismiss();
    }
  }, [closeTerminal]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSheetChanges}
      backgroundStyle={{ backgroundColor: '#000000', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
      handleIndicatorStyle={{ backgroundColor: '#3F3F46' }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
      )}
    >
      <View className="flex-1" style={{ paddingBottom: insets.bottom }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2 bg-[#09090B] border-b border-white/5">
          <View className="flex-row items-center">
            <TerminalIcon size={14} color="#2DD4BF" className="mr-2" />
            <Text className="text-zinc-300 font-bold text-[10px] tracking-widest uppercase">Server Terminal</Text>
            {isAutoScrollLocked && (
              <View className="ml-3 bg-white/10 px-1.5 py-0.5 rounded">
                <Text className="text-zinc-400 text-[8px] uppercase tracking-widest">Scroll Locked</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-4">
            <Pressable onPress={() => { clearTerminal(); setIsAutoScrollLocked(false); }} className="active:opacity-50">
              <Trash2 size={14} color="#71717A" />
            </Pressable>
            <Pressable onPress={() => bottomSheetRef.current?.close()} className="active:opacity-50">
              <X size={18} color="#71717A" />
            </Pressable>
          </View>
        </View>

        {/* Terminal Output & Input */}
        <BottomSheetScrollView 
          ref={scrollViewRef}
          className="flex-1 p-2 bg-[#000000]"
          indicatorStyle="white"
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {lines.length === 0 && !inputValue ? (
            <View className="p-4 items-center opacity-30 mt-10 mb-4">
              <TerminalIcon size={32} color="#A1A1AA" className="mb-2" />
              <Text className="text-zinc-500 font-mono text-xs">Terminal is empty. Waiting for commands...</Text>
            </View>
          ) : null}
          
          {lines.map(line => <LineRenderer key={line.id} line={line} />)}

          {/* Inline Terminal Input */}
          <View className="flex-row items-center px-2 py-0.5 mt-1">
            <Text className="text-[#2DD4BF] font-mono text-[11px] opacity-80 mr-2">root@proreus:~#</Text>
            <TextInput 
              className="flex-1 text-[#A1A1AA] font-mono text-[11px] p-0 m-0"
              placeholder=""
              placeholderTextColor="#3F3F46"
              autoCapitalize="none"
              autoCorrect={false}
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleCommandSubmit}
              blurOnSubmit={false}
            />
          </View>
          
          {/* Bottom Padding for scroll breathing room */}
          <View className="h-4" />
        </BottomSheetScrollView>
      </View>
    </BottomSheet>
  );
};
