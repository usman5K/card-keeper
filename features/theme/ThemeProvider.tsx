import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { colorScheme as nwColorScheme, vars } from 'nativewind';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance, View } from 'react-native';

import {
  darkColors,
  lightColors,
  themeCssVars,
  type AppColors,
  type ThemePreference,
} from '@/theme/tokens';

const STORAGE_KEY = 'fuelledger.themePreference';

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  colors: AppColors;
  ready: boolean;
  setPreference: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveScheme(
  preference: ThemePreference,
  system: 'light' | 'dark',
): 'light' | 'dark' {
  return preference === 'system' ? system : preference;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(() =>
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!active) {
        return;
      }
      if (raw === 'light' || raw === 'dark' || raw === 'system') {
        setPreferenceState(raw);
      }
      setReady(true);
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const resolved = resolveScheme(preference, systemScheme);
  const colors = resolved === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    if (!ready) {
      return;
    }
    nwColorScheme.set(preference === 'system' ? 'system' : preference);
  }, [preference, ready]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolved,
      colors,
      ready,
      setPreference,
    }),
    [preference, resolved, colors, ready, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, vars(themeCssVars(colors))]} className="flex-1 bg-background">
        <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme requires ThemeProvider');
  }
  return ctx;
}
