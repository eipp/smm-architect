import type { ThemeName } from './tokens';
// Design System Exports
export { default as tokens, motionConfig, themes, getThemeTokens } from './tokens';
export type { DesignTokens, MotionConfig, ThemeName } from './tokens';

export { 
  getMotionConfig, 
  motionVariants, 
  springs, 
  durations, 
  easings 
} from './motion';

// Utility functions for design system
export const getColor = (path: string) => {
  const keys = path.split('.');
  let value: any = tokens.color;
  
  for (const key of keys) {
    value = value?.[key];
  }
  
  return value || null;
};

export const getSpacing = (key: keyof typeof tokens.spacing) => {
  return tokens.spacing[key];
};

export const getBorderRadius = (key: keyof typeof tokens.borderRadius) => {
  return tokens.borderRadius[key];
};

export const getShadow = (key: keyof typeof tokens.shadow) => {
  return tokens.shadow[key];
};

// Component utility functions
export const getComponentToken = (component: keyof typeof tokens.component, property: string) => {
  const componentTokens = tokens.component[component];
  return (componentTokens as any)?.[property] || null;
};

// CSS variable helpers
export const getCSSVar = (name: string) => `var(--${name})`;

// Color utilities with HSL support
export const createColorScale = (baseHue: number, saturation: number) => ({
  50: `hsl(${baseHue} ${saturation}% 97%)`,
  100: `hsl(${baseHue} ${saturation}% 92%)`,
  200: `hsl(${baseHue} ${saturation}% 85%)`,
  300: `hsl(${baseHue} ${saturation}% 75%)`,
  400: `hsl(${baseHue} ${saturation}% 62%)`,
  500: `hsl(${baseHue} ${saturation}% 49%)`,
  600: `hsl(${baseHue} ${saturation}% 38%)`,
  700: `hsl(${baseHue} ${saturation}% 30%)`,
  800: `hsl(${baseHue} ${saturation}% 22%)`,
  900: `hsl(${baseHue} ${saturation}% 15%)`,
  950: `hsl(${baseHue} ${saturation}% 10%)`
});

// Typography utilities
export const getTypeScale = (size: keyof typeof tokens.typography.fontSize) => ({
  fontSize: tokens.typography.fontSize[size],
  lineHeight: tokens.typography.lineHeight[size]
});

// Responsive utilities
export const createResponsiveValue = (mobile: string, tablet?: string, desktop?: string) => ({
  base: mobile,
  md: tablet || mobile,
  lg: desktop || tablet || mobile
});

// Animation helpers
export const createAnimation = (keyframes: Record<string, any>, options?: {
  duration?: keyof typeof tokens.motion.duration;
  easing?: keyof typeof tokens.motion.easing;
}) => ({
  keyframes,
  duration: options?.duration ? tokens.motion.duration[options.duration] : tokens.motion.duration.normal,
  easing: options?.easing ? tokens.motion.easing[options.easing] : tokens.motion.easing.easeOut
});

// Layout utilities
export const createLayout = (config: {
  padding?: keyof typeof tokens.spacing;
  gap?: keyof typeof tokens.spacing;
  borderRadius?: keyof typeof tokens.borderRadius;
}) => ({
  padding: config.padding ? tokens.spacing[config.padding] : undefined,
  gap: config.gap ? tokens.spacing[config.gap] : undefined,
  borderRadius: config.borderRadius ? tokens.borderRadius[config.borderRadius] : undefined
});

// Theme helpers
export const isLightMode = () => {
  if (typeof window === 'undefined') return true;
  return !document.documentElement.classList.contains('dark');
};

export const prefersDarkMode = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const setTheme = (theme: ThemeName) => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

// Export everything as default for convenience
export default {
  tokens,
  motionConfig,
  getMotionConfig,
  motionVariants,
  springs,
  durations,
  easings,
  getColor,
  getSpacing,
  getBorderRadius,
  getShadow,
  getComponentToken,
  getCSSVar,
  createColorScale,
  getTypeScale,
  createResponsiveValue,
  createAnimation,
  createLayout,
  isLightMode,
  prefersDarkMode,
  setTheme,
  themes,
  getThemeTokens
};