import { MD3LightTheme } from 'react-native-paper';

export const Colors = {
  // C2 Deep Tide palette
  primary: '#0A9396',        // Teal Ocean
  primaryDark: '#005F73',    // Sky Blue / deep teal
  deepDark: '#002830',       // Near-black teal (headers)
  gold: '#EE9B00',           // Summer Sun
  goldDark: '#CC8400',
  secondary: '#0A9396',
  accent: '#EE9B00',
  error: '#E04040',
  surface: '#FFFFFF',
  background: '#FFF9F4',     // White Cloud / cream
  onSurface: '#002830',
  muted: '#6B8A8C',
  border: '#D0E8EA',
  premiumGold: '#EE9B00',
  cardShadow: 'rgba(0,40,48,0.08)',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    secondary: Colors.secondary,
    error: Colors.error,
    background: Colors.background,
    surface: Colors.surface,
  },
};

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '500' as const },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 999,
};
