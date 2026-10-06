import { Tabs, useRouter } from 'expo-router';
import {
  CreditCard,
  Home,
  LineChart,
  Settings,
  Users,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { OfflineBanner } from '@/components/OfflineBanner';
import { SyncBadge } from '@/components/SyncBadge';
import { useSync } from '@/features/sync/SyncProvider';
import { useTheme } from '@/features/theme/ThemeProvider';
import { a11y } from '@/theme/tokens';

function TabHeaderRight() {
  const { status, counts } = useSync();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View className="mr-md flex-row items-center" style={{ gap: 8 }}>
      <SyncBadge
        status={status}
        pendingCount={counts.pending}
        conflictCount={counts.conflict}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        className="items-center justify-center rounded-full"
        style={({ pressed }) => ({
          minHeight: a11y.minHit,
          minWidth: a11y.minHit,
          opacity: pressed ? 0.7 : 1,
        })}
        onPress={() => router.push('/settings')}>
        <Settings color={colors.ink} size={22} />
      </Pressable>
    </View>
  );
}

export default function TabLayout() {
  const { status } = useSync();
  const { colors } = useTheme();

  return (
    <View className="flex-1 bg-background">
      <OfflineBanner visible={status === 'offline'} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleStyle: { color: colors.ink, fontWeight: '700', fontSize: 22 },
          headerRight: () => <TabHeaderRight />,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarAccessibilityLabel: 'Home tab',
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="cards"
          options={{
            title: 'Cards',
            tabBarAccessibilityLabel: 'Cards tab',
            tabBarIcon: ({ color, size }) => (
              <CreditCard color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="people"
          options={{
            title: 'People',
            tabBarAccessibilityLabel: 'People tab',
            tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarAccessibilityLabel: 'Reports tab',
            tabBarIcon: ({ color, size }) => (
              <LineChart color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
