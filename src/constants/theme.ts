/**
 * BallerClash Design System
 * Street basketball — dark, bold, urban aesthetic
 */

export const Colors = {
  // Core backgrounds
  background: '#0d0d0f',
  backgroundDeep: '#080809',
  surface: '#161618',
  surfaceElevated: '#1e1e22',
  surfaceGlass: 'rgba(30, 30, 34, 0.85)',

  // Brand — orange/amber (basketball)
  primary: '#f97316',
  primaryLight: '#fb923c',
  primaryDark: '#ea580c',
  primaryGlow: 'rgba(249, 115, 22, 0.35)',
  primarySubtle: 'rgba(249, 115, 22, 0.12)',

  // Accent
  accentGold: '#fbbf24',
  accentGreen: '#22c55e',
  accentRed: '#ef4444',
  accentBlue: '#3b82f6',
  accentPurple: '#a855f7',

  // Text
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
  textMuted: 'rgba(255, 255, 255, 0.38)',
  textInverse: '#0d0d0f',

  // UI
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.15)',
  divider: 'rgba(255, 255, 255, 0.06)',

  // Nav
  navBackground: '#111113',
  navBorder: 'rgba(255, 255, 255, 0.07)',
  navIconActive: '#f97316',

  // Status
  success: '#22c55e',
  warning: '#fbbf24',
  error: '#ef4444',

  // Rating tiers
  ratingElite: '#fbbf24',    // 8.5+
  ratingGood: '#22c55e',     // 7.0–8.4
  ratingAvg: '#3b82f6',      // 5.5–6.9
  ratingLow: '#6b7280',      // <5.5
};

export const Typography = {
  // Sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
  display: 48,

  // Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
  black: '900' as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: '#f97316',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
};
