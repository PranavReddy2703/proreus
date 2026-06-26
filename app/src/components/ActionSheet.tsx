import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Pressable, Platform, Dimensions, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export function ActionSheet({ visible, onClose, title, rightAction, children }: ActionSheetProps) {
  const { height } = Dimensions.get('window');
  
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 25,
          stiffness: 300,
          mass: 0.8,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: height,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  // Don't unmount immediately to allow exit animation
  if (!visible && backdropOpacity._value === 0) return null;

  return (
    <Modal visible={true} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[{ flex: 1, opacity: backdropOpacity }]}>
        <Pressable 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} 
          onPress={onClose}
        >
          {Platform.OS !== 'android' ? (
            <BlurView intensity={20} tint="dark" style={{ flex: 1 }} />
          ) : null}
        </Pressable>
      </Animated.View>

      <Animated.View 
        style={[
          { position: 'absolute', bottom: 0, left: 0, right: 0 },
          { transform: [{ translateY }] }
        ]}
      >
        <View className="bg-[#09090B] border-t border-white/10 rounded-t-3xl pt-2 pb-8 px-5 shadow-2xl shadow-black">
          <View className="items-center mb-4 pt-2">
            <View className="w-12 h-1 bg-white/20 rounded-full" />
          </View>
          
          {(title || rightAction) && (
            <View className="flex-row items-center justify-between mb-4">
              {title ? <Text className="text-white font-bold text-lg">{title}</Text> : <View />}
              {rightAction}
            </View>
          )}
          
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}
