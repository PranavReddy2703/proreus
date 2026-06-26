import React, { useState } from 'react';
import { View, Text, LayoutChangeEvent, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS,
  withTiming
} from 'react-native-reanimated';

import * as Haptics from 'expo-haptics';

interface SwipeToConfirmProps {
  onConfirm: () => void;
  title: string;
  icon: React.ReactNode;
  color?: string;
  trackColor?: string;
  borderColor?: string;
  thumbColor?: string;
  textColor?: string;
}

const THUMB_SIZE = 56;
const BORDER_WIDTH = 1;
const PADDING = 3;
// Inner thumb size to perfectly fit within the borders and padding
const INNER_THUMB_SIZE = THUMB_SIZE - (BORDER_WIDTH * 2) - (PADDING * 2);

export const SwipeToConfirm = ({ 
  onConfirm, 
  title, 
  icon,
  color = '#FB7185',
  trackColor = 'rgba(251, 113, 133, 0.1)',
  borderColor = 'rgba(251, 113, 133, 0.2)',
  thumbColor,
  textColor
}: SwipeToConfirmProps) => {
  const resolvedThumbColor = thumbColor || color;
  const resolvedTextColor = textColor || color;

  const [trackWidth, setTrackWidth] = useState(0);
  
  // Max translation is total width minus the full height of the component
  const MAX_TRANSLATION = Math.max(0, trackWidth - THUMB_SIZE);
  
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isPressed = useSharedValue(false);

  const handleConfirm = () => {
    onConfirm();
    setTimeout(() => {
      translateX.value = withSpring(0);
      opacity.value = withTiming(1);
    }, 1000);
  };

  const triggerHaptic = (type: 'light' | 'success') => {
    if (type === 'light') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      isPressed.value = true;
      runOnJS(triggerHaptic)('light');
    })
    .onUpdate((event) => {
      translateX.value = Math.max(0, Math.min(event.translationX, MAX_TRANSLATION));
      opacity.value = 1 - (translateX.value / MAX_TRANSLATION);
    })
    .onEnd(() => {
      if (translateX.value > MAX_TRANSLATION * 0.8) {
        translateX.value = withSpring(MAX_TRANSLATION);
        runOnJS(triggerHaptic)('success');
        runOnJS(handleConfirm)();
      } else {
        translateX.value = withSpring(0, { damping: 14, stiffness: 150 });
        opacity.value = withTiming(1);
        runOnJS(triggerHaptic)('light');
      }
    })
    .onFinalize(() => {
      isPressed.value = false;
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: withSpring(isPressed.value ? 1.05 : 1) }
    ]
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  return (
    <View 
      onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
      style={{ 
        position: 'relative',
        height: THUMB_SIZE, 
        borderRadius: THUMB_SIZE / 2, 
        borderWidth: BORDER_WIDTH, 
        borderColor,
        overflow: 'hidden',
        backgroundColor: trackColor
      }}
    >
      <BlurView intensity={30} tint="dark" style={[StyleSheet.absoluteFill, { zIndex: 0 }]} />

      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 2 }]} pointerEvents="none">
        <Animated.Text 
          style={[{ color: resolvedTextColor, fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase', letterSpacing: 2 }, textStyle]}
        >
          {title}
        </Animated.Text>
      </View>

      {trackWidth > 0 && (
        <GestureDetector gesture={pan}>
          <Animated.View 
            style={[
              { 
                position: 'absolute',
                left: PADDING,
                top: PADDING,
                width: INNER_THUMB_SIZE, 
                height: INNER_THUMB_SIZE, 
                backgroundColor: resolvedThumbColor,
                borderRadius: INNER_THUMB_SIZE / 2,
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 3
              }, 
              thumbStyle
            ]}
          >
            {icon}
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
};
