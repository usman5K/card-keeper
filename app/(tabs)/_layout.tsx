import { Tabs } from 'expo-router';
import {
  CreditCard,
  Home,
  LineChart,
  Users,
} from 'lucide-react-native';
import { View } from 'react-native';

import { OfflineBanner } from '@/components/OfflineBanner';
import { SyncBadge } from '@/components/SyncBadge';
import { useSync } from '@/features/sync/SyncProvider';
import { colors } from '@/theme/tokens';

function TabHeaderSync() {
  const { status, counts } = useSync();
  return (
    <View className="mr-md">
      <SyncBadge
        status={status}
        pendingCount={counts.pending}
        conflictCount={counts.conflict}
      />
    </View>
  );
}

export default function TabLayout() {
  const { status } = useSync();

  return (
    <View className="flex-1 bg-background">
      <OfflineBanner visible={status === 'offline'} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.ink, fontWeight: '600' },
          headerRight: () => <TabHeaderSync />,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
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
