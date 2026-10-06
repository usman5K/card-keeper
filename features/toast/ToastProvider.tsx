import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/features/theme/ThemeProvider';

export type ToastTone = 'success' | 'error' | 'info';

export type ToastInput = {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
  durationMs: number;
};

type ToastContextValue = {
  show: (input: ToastInput) => void;
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
};

const DEFAULT_DURATION = 3200;
const ToastContext = createContext<ToastContextValue | null>(null);

let externalShow: ((input: ToastInput) => void) | null = null;

export const toast = {
  show(input: ToastInput) {
    externalShow?.(input);
  },
  success(message: string, durationMs = DEFAULT_DURATION) {
    externalShow?.({ message, tone: 'success', durationMs });
  },
  error(message: string, durationMs = 4000) {
    externalShow?.({ message, tone: 'error', durationMs });
  },
  info(message: string, durationMs = DEFAULT_DURATION) {
    externalShow?.({ message, tone: 'info', durationMs });
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const queueRef = useRef<ToastItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const presentNext = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    setCurrent(next);
    clearTimer();
    if (!next) {
      return;
    }
    timerRef.current = setTimeout(() => {
      setCurrent(null);
      timerRef.current = setTimeout(() => {
        presentNext();
      }, 160);
    }, next.durationMs);
  }, [clearTimer]);

  const show = useCallback(
    (input: ToastInput) => {
      const message = input.message.trim();
      if (!message) {
        return;
      }
      const item: ToastItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message,
        tone: input.tone ?? 'info',
        durationMs: input.durationMs ?? DEFAULT_DURATION,
      };
      if (current) {
        queueRef.current.push(item);
        return;
      }
      setCurrent(item);
      clearTimer();
      timerRef.current = setTimeout(() => {
        setCurrent(null);
        timerRef.current = setTimeout(() => {
          presentNext();
        }, 160);
      }, item.durationMs);
    },
    [clearTimer, current, presentNext],
  );

  const dismiss = useCallback(() => {
    clearTimer();
    setCurrent(null);
    timerRef.current = setTimeout(() => {
      presentNext();
    }, 120);
  }, [clearTimer, presentNext]);

  useEffect(() => {
    externalShow = show;
    return () => {
      if (externalShow === show) {
        externalShow = null;
      }
      clearTimer();
    };
  }, [show, clearTimer]);

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message, durationMs) => show({ message, tone: 'success', durationMs }),
      error: (message, durationMs) => show({ message, tone: 'error', durationMs }),
      info: (message, durationMs) => show({ message, tone: 'info', durationMs }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport item={current} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast requires ToastProvider');
  }
  return ctx;
}

function ToastViewport({
  item,
  onDismiss,
}: {
  item: ToastItem | null;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const progress = useSharedValue(1);

  useEffect(() => {
    if (!item) {
      return;
    }
    progress.value = 1;
    progress.value = withTiming(0, { duration: item.durationMs });
  }, [item, progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.max(progress.value, 0) * 100}%`,
  }));

  if (!item) {
    return null;
  }

  const backgroundColor =
    item.tone === 'success'
      ? colors.accentSoft
      : item.tone === 'error'
        ? resolved === 'dark'
          ? '#3A1D1A'
          : '#FCEBEA'
        : colors.surface;

  const barColor =
    item.tone === 'success'
      ? colors.accent
      : item.tone === 'error'
        ? colors.danger
        : colors.muted;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        top: Math.max(insets.top, 12) + 8,
        zIndex: 1000,
      }}>
      <Animated.View entering={FadeInUp.duration(180)} exiting={FadeOutUp.duration(160)}>
        <Pressable
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          onPress={onDismiss}
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor,
            paddingHorizontal: 14,
            paddingTop: 12,
            paddingBottom: 10,
            shadowColor: '#000',
            shadowOpacity: resolved === 'dark' ? 0.35 : 0.12,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}>
          <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '600' }}>
            {item.message}
          </Text>
          <View
            style={{
              marginTop: 10,
              height: 3,
              borderRadius: 999,
              backgroundColor: colors.border,
              overflow: 'hidden',
            }}>
            <Animated.View
              style={[
                {
                  height: 3,
                  borderRadius: 999,
                  backgroundColor: barColor,
                },
                barStyle,
              ]}
            />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
