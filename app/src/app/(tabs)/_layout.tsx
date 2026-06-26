import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { View, Platform, StyleSheet, Text, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useUIStore } from '../../store/useUIStore';

function CustomHeader() {
  const insets = useSafeAreaInsets();
  const showOverlay = useUIStore((state) => state.showOverlay);
  
  return (
    <View style={{ paddingTop: insets.top }}>
      {Platform.OS !== 'android' ? (
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(9, 9, 11, 0.9)' }]} />
      )}
      <View className="px-4 py-3 flex-row justify-between items-center border-b border-white/5">
        <Text className="font-bold text-xs tracking-widest">
          <Text className="text-[#2DD4BF]">PROREUS</Text>
          <Text className="text-zinc-500"> - SERVER CONTROL</Text>
        </Text>

        <View className="flex-row items-center gap-x-4">
          <Pressable onPress={() => showOverlay('server-switcher')} className="active:opacity-50">
            <Feather name="server" size={18} color="#A1A1AA" />
          </Pressable>
          <Pressable onPress={() => showOverlay('notifications')} className="active:opacity-50">
            <Feather name="bell" size={18} color="#A1A1AA" />
          </Pressable>
          <Pressable onPress={() => showOverlay('power')} className="active:opacity-50">
            <Feather name="power" size={18} color="#FB7185" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function TabIcon({ name, focused, color, label }: { name: any, focused: boolean, color: any, label: string }) {
  return (
    <View className="items-center justify-center">
      <Feather name={name} size={22} color={color} />
      <Text 
        numberOfLines={1}
        adjustsFontSizeToFit
        className={`text-[10px] mt-1 text-center ${focused ? 'text-[#2DD4BF] font-medium' : 'text-zinc-500'}`}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        header: () => <CustomHeader />,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          paddingBottom: Platform.OS === 'ios' ? 10 : 0,
          paddingTop: 16,
          borderTopWidth: 0,
          backgroundColor: Platform.OS === 'android' ? '#09090B' : 'transparent',
          elevation: 0,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            {Platform.OS !== 'android' && (
              <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
            )}
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1 }}
            />
          </View>
        ),
        tabBarActiveTintColor: '#2DD4BF', // Teal primary
        tabBarInactiveTintColor: '#71717A', // Zinc 500
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon name="grid" focused={focused} color={color} label="Stats" />,
        }}
      />
      <Tabs.Screen
        name="docker"
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon name="package" focused={focused} color={color} label="Docker" />,
        }}
      />
      <Tabs.Screen
        name="macros"
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon name="terminal" focused={focused} color={color} label="Macros" />,
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon name="align-left" focused={focused} color={color} label="Logs" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, focused }) => <TabIcon name="settings" focused={focused} color={color} label="Settings" />,
        }}
      />
    </Tabs>
  );
}
