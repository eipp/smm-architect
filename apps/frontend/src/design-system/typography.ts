import { tokens } from './tokens';

// Typography utilities based on 1.25 modular scale
export const typeScale = {
  xs: {
    fontSize: tokens.typography.fontSize.xs,
    lineHeight: tokens.typography.lineHeight.xs,
    letterSpacing: tokens.typography.letterSpacing.normal,
  },
  sm: {
    fontSize: tokens.typography.fontSize.sm,
    lineHeight: tokens.typography.lineHeight.sm,
    letterSpacing: tokens.typography.letterSpacing.normal,
  },
  base: {
    fontSize: tokens.typography.fontSize.base,
    lineHeight: tokens.typography.lineHeight.base,
    letterSpacing: tokens.typography.letterSpacing.normal,
  },
  lg: {
    fontSize: tokens.typography.fontSize.lg,
    lineHeight: tokens.typography.lineHeight.lg,
    letterSpacing: tokens.typography.letterSpacing.normal,
  },
  xl: {
    fontSize: tokens.typography.fontSize.xl,
    lineHeight: tokens.typography.lineHeight.xl,
    letterSpacing: tokens.typography.letterSpacing.tight,
  },
  '2xl': {
    fontSize: tokens.typography.fontSize['2xl'],
    lineHeight: tokens.typography.lineHeight['2xl'],
    letterSpacing: tokens.typography.letterSpacing.tight,
  },
  '3xl': {
    fontSize: tokens.typography.fontSize['3xl'],
    lineHeight: tokens.typography.lineHeight['3xl'],
    letterSpacing: tokens.typography.letterSpacing.tight,
  },
  '4xl': {
    fontSize: tokens.typography.fontSize['4xl'],
    lineHeight: tokens.typography.lineHeight['4xl'],
    letterSpacing: tokens.typography.letterSpacing.tight,
  },
};

// Semantic typography for different UI elements
export const textVariants = {
  // Headings
  h1: {
    ...typeScale['4xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    fontFamily: tokens.typography.fontFamily.primary,
  },
  h2: {
    ...typeScale['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    fontFamily: tokens.typography.fontFamily.primary,
  },
  h3: {
    ...typeScale['2xl'],
    fontWeight: tokens.typography.fontWeight.semibold,
    fontFamily: tokens.typography.fontFamily.primary,
  },
  h4: {
    ...typeScale.xl,
    fontWeight: tokens.typography.fontWeight.semibold,
    fontFamily: tokens.typography.fontFamily.primary,
  },
  h5: {
    ...typeScale.lg,
    fontWeight: tokens.typography.fontWeight.medium,
    fontFamily: tokens.typography.fontFamily.primary,
  },
  h6: {
    ...typeScale.base,
    fontWeight: tokens.typography.fontWeight.medium,
    fontFamily: tokens.typography.fontFamily.primary,
  },
  
  // Body text
  body: {
    ...typeScale.base,
    fontWeight: tokens.typography.fontWeight.normal,
    fontFamily: tokens.typography.fontFamily.primary,
  },
  bodyLarge: {
    ...typeScale.lg,
    fontWeight: tokens.typography.fontWeight.normal,
    fontFamily: tokens.typography.fontFamily.primary,
  },
  bodySmall: {
    ...typeScale.sm,
    fontWeight: tokens.typography.fontWeight.normal,
    fontFamily: tokens.typography.fontFamily.primary,
  },
  
  // UI elements
  label: {
    ...typeScale.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    fontFamily: tokens.typography.fontFamily.primary,
    letterSpacing: tokens.typography.letterSpacing.wide,
  },
  caption: {
    ...typeScale.xs,
    fontWeight: tokens.typography.fontWeight.normal,
    fontFamily: tokens.typography.fontFamily.primary,
  },
  overline: {
    ...typeScale.xs,
    fontWeight: tokens.typography.fontWeight.medium,
    fontFamily: tokens.typography.fontFamily.primary,
    letterSpacing: tokens.typography.letterSpacing.wide,
    textTransform: 'uppercase' as const,
  },
  
  // Code and technical
  code: {
    fontSize: typeScale.sm.fontSize,
    lineHeight: typeScale.sm.lineHeight,
    fontWeight: tokens.typography.fontWeight.normal,
    fontFamily: tokens.typography.fontFamily.mono,
  },
  codeBlock: {
    fontSize: typeScale.base.fontSize,
    lineHeight: '1.6',
    fontWeight: tokens.typography.fontWeight.normal,
    fontFamily: tokens.typography.fontFamily.mono,
  },
  
  // Specialized UI text
  button: {
    fontSize: typeScale.sm.fontSize,
    lineHeight: '1.2',
    fontWeight: tokens.typography.fontWeight.medium,
    fontFamily: tokens.typography.fontFamily.primary,
    letterSpacing: tokens.typography.letterSpacing.wide,
  },
  input: {
    fontSize: typeScale.base.fontSize,
    lineHeight: typeScale.base.lineHeight,
    fontWeight: tokens.typography.fontWeight.normal,
    fontFamily: tokens.typography.fontFamily.primary,
  },
  
  // Marketing and hero text
  hero: {
    fontSize: tokens.typography.fontSize['4xl'],
    lineHeight: tokens.typography.lineHeight['4xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    fontFamily: tokens.typography.fontFamily.secondary, // IBM Plex Serif for headlines
    letterSpacing: tokens.typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: tokens.typography.fontSize.xl,
    lineHeight: tokens.typography.lineHeight.xl,
    fontWeight: tokens.typography.fontWeight.normal,
    fontFamily: tokens.typography.fontFamily.primary,
    letterSpacing: tokens.typography.letterSpacing.normal,
  },
};

// Responsive typography utilities
export const createResponsiveType = (config: {
  mobile: keyof typeof typeScale;
  tablet?: keyof typeof typeScale;
  desktop?: keyof typeof typeScale;
}) => {
  const { mobile, tablet, desktop } = config;
  
  return {
    fontSize: typeScale[mobile].fontSize,
    lineHeight: typeScale[mobile].lineHeight,
    '@media (min-width: 768px)': {
      fontSize: typeScale[tablet || mobile].fontSize,
      lineHeight: typeScale[tablet || mobile].lineHeight,
    },
    '@media (min-width: 1024px)': {
      fontSize: typeScale[desktop || tablet || mobile].fontSize,
      lineHeight: typeScale[desktop || tablet || mobile].lineHeight,
    },
  };
};

// Text color utilities based on design tokens
export const textColors = {
  primary: 'hsl(var(--color-neutral-900))',
  secondary: 'hsl(var(--color-neutral-600))',
  muted: 'hsl(var(--color-neutral-500))',
  accent: 'hsl(var(--color-primary-600))',
  success: 'hsl(var(--color-success-600))',
  warning: 'hsl(var(--color-warning-600))',
  error: 'hsl(var(--color-error-600))',
  inverse: 'hsl(var(--color-neutral-50))',
  brand: 'hsl(var(--color-primary-500))',
  agent: 'hsl(var(--color-accent-500))',
};

// Font weight utilities
export const fontWeights = {
  normal: tokens.typography.fontWeight.normal,
  medium: tokens.typography.fontWeight.medium,
  semibold: tokens.typography.fontWeight.semibold,
  bold: tokens.typography.fontWeight.bold,
};

// Letter spacing utilities
export const letterSpacing = {
  tight: tokens.typography.letterSpacing.tight,
  normal: tokens.typography.letterSpacing.normal,
  wide: tokens.typography.letterSpacing.wide,
};

// Line height utilities
export const lineHeights = {
  tight: '1.2',
  normal: '1.5',
  relaxed: '1.6',
  loose: '1.8',
};

// Utility function to create text styles
export const createTextStyle = (config: {
  size: keyof typeof typeScale;
  weight?: keyof typeof fontWeights;
  color?: keyof typeof textColors;
  family?: 'primary' | 'secondary' | 'mono';
  spacing?: keyof typeof letterSpacing;
}) => {
  const { size, weight = 'normal', color = 'primary', family = 'primary', spacing = 'normal' } = config;
  
  const fontFamilyMap = {
    primary: tokens.typography.fontFamily.primary,
    secondary: tokens.typography.fontFamily.secondary,
    mono: tokens.typography.fontFamily.mono,
  };
  
  return {
    fontSize: typeScale[size].fontSize,
    lineHeight: typeScale[size].lineHeight,
    fontWeight: fontWeights[weight],
    color: textColors[color],
    fontFamily: fontFamilyMap[family],
    letterSpacing: tokens.typography.letterSpacing[spacing],
  };
};

// Reading experience optimizations
export const readingStyles = {
  // Optimized for long-form content
  article: {
    fontSize: typeScale.lg.fontSize,
    lineHeight: '1.7',
    fontWeight: tokens.typography.fontWeight.normal,
    color: textColors.primary,
    maxWidth: '65ch', // Optimal reading line length
  },
  
  // Optimized for UI text
  interface: {
    fontSize: typeScale.base.fontSize,
    lineHeight: typeScale.base.lineHeight,
    fontWeight: tokens.typography.fontWeight.normal,
    color: textColors.primary,
  },
  
  // Optimized for data display
  data: {
    fontSize: typeScale.sm.fontSize,
    lineHeight: '1.4',
    fontWeight: tokens.typography.fontWeight.normal,
    fontFamily: tokens.typography.fontFamily.mono,
    color: textColors.secondary,
  },
};

export default {
  typeScale,
  textVariants,
  createResponsiveType,
  textColors,
  fontWeights,
  letterSpacing,
  lineHeights,
  createTextStyle,
  readingStyles,
};