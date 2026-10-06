export type ThemePreference = 'system' | 'light' | 'dark';

export type AppColors = {
  background: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
  danger: string;
  border: string;
  online: string;
  offline: string;
};

export const lightColors: AppColors = {
  background: '#F7F6F2',
  surface: '#FFFFFF',
  ink: '#1A1F1C',
  muted: '#6B7280',
  accent: '#0F6B4C',
  accentSoft: '#E6F2EC',
  danger: '#B42318',
  border: '#E5E2DA',
  online: '#0F6B4C',
  offline: '#9A6700',
};

export const darkColors: AppColors = {
  background: '#121512',
  surface: '#1C211E',
  ink: '#F3F4F1',
  muted: '#9CA3AF',
  accent: '#3D9B74',
  accentSoft: '#1A2E26',
  danger: '#F97066',
  border: '#2E3531',
  online: '#3D9B74',
  offline: '#D4A017',
};

export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  hero: 40,
  title: 22,
  body: 16,
  caption: 13,
} as const;

export const a11y = {
  minHit: 44,
} as const;

export function themeCssVars(palette: AppColors) {
  return {
    '--color-background': palette.background,
    '--color-surface': palette.surface,
    '--color-ink': palette.ink,
    '--color-muted': palette.muted,
    '--color-accent': palette.accent,
    '--color-accent-soft': palette.accentSoft,
    '--color-danger': palette.danger,
    '--color-border': palette.border,
    '--color-online': palette.online,
    '--color-offline': palette.offline,
  } as const;
}
