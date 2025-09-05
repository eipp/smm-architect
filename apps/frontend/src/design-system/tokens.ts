export const motionConfig = {
  pop: { type: 'spring' as const, stiffness: 700, damping: 40 },
  gentle: { type: 'spring' as const, stiffness: 200, damping: 30 },
  bouncy: { type: 'spring' as const, stiffness: 400, damping: 20 },
  fade: { duration: 0.2, ease: [0.2, 0.9, 0.2, 1] as [number, number, number, number] }
};

// Base design tokens for the light theme
const lightTokens = {
  color: {
    primary: {
      50: 'hsl(215 100% 97%)',
      100: 'hsl(215 95% 92%)',
      200: 'hsl(215 95% 85%)',
      300: 'hsl(215 95% 75%)',
      400: 'hsl(215 95% 62%)',
      500: 'hsl(215 95% 49%)',
      600: 'hsl(215 100% 38%)',
      700: 'hsl(215 100% 30%)',
      800: 'hsl(215 100% 22%)',
      900: 'hsl(215 85% 15%)',
      950: 'hsl(215 85% 10%)'
    },
    accent: {
      50: 'hsl(280 100% 97%)',
      100: 'hsl(280 95% 92%)',
      200: 'hsl(280 95% 85%)',
      300: 'hsl(280 95% 75%)',
      400: 'hsl(280 90% 64%)',
      500: 'hsl(280 85% 53%)',
      600: 'hsl(280 85% 42%)',
      700: 'hsl(280 85% 32%)',
      800: 'hsl(280 85% 24%)',
      900: 'hsl(280 85% 18%)',
      950: 'hsl(280 85% 12%)'
    },
    success: {
      50: 'hsl(140 80% 95%)',
      100: 'hsl(140 75% 88%)',
      200: 'hsl(140 70% 78%)',
      300: 'hsl(140 65% 65%)',
      400: 'hsl(140 60% 52%)',
      500: 'hsl(140 60% 40%)',
      600: 'hsl(140 65% 32%)',
      700: 'hsl(140 70% 25%)',
      800: 'hsl(140 75% 20%)',
      900: 'hsl(140 80% 15%)',
      950: 'hsl(140 85% 10%)'
    },
    warning: {
      50: 'hsl(40 100% 95%)',
      100: 'hsl(40 100% 88%)',
      200: 'hsl(40 100% 78%)',
      300: 'hsl(40 100% 65%)',
      400: 'hsl(40 98% 55%)',
      500: 'hsl(40 95% 45%)',
      600: 'hsl(40 95% 35%)',
      700: 'hsl(40 95% 27%)',
      800: 'hsl(40 95% 20%)',
      900: 'hsl(40 95% 15%)',
      950: 'hsl(40 95% 10%)'
    },
    error: {
      50: 'hsl(360 100% 97%)',
      100: 'hsl(360 95% 92%)',
      200: 'hsl(360 90% 85%)',
      300: 'hsl(360 88% 75%)',
      400: 'hsl(360 85% 64%)',
      500: 'hsl(360 85% 52%)',
      600: 'hsl(360 88% 42%)',
      700: 'hsl(360 90% 32%)',
      800: 'hsl(360 92% 24%)',
      900: 'hsl(360 95% 18%)',
      950: 'hsl(360 95% 12%)'
    },
    neutral: {
      50: 'hsl(210 40% 98%)',
      100: 'hsl(210 40% 96%)',
      200: 'hsl(210 30% 92%)',
      300: 'hsl(210 25% 85%)',
      400: 'hsl(210 20% 70%)',
      500: 'hsl(210 15% 55%)',
      600: 'hsl(210 15% 42%)',
      700: 'hsl(210 15% 32%)',
      800: 'hsl(210 15% 22%)',
      900: 'hsl(210 15% 12%)',
      950: 'hsl(210 15% 8%)'
    },
    semantic: {
      canvasBackground: 'hsl(210 40% 98%)',
      agentActive: 'hsl(280 85% 53%)',
      simulationRunning: 'hsl(40 95% 45%)',
      policyCompliant: 'hsl(140 60% 40%)',
      auditVerified: 'hsl(200 85% 45%)',
      workspaceBackground: 'hsl(0 0% 100%)',
      surfaceElevated: 'hsl(0 0% 100%)',
      borderSubtle: 'hsl(210 25% 85%)',
      borderStrong: 'hsl(210 20% 70%)'
    }
  },
  typography: {
    fontFamily: {
      primary: 'Inter Variable, Inter, system-ui, sans-serif',
      secondary: 'IBM Plex Serif, Georgia, serif',
      mono: 'JetBrains Mono, Monaco, Consolas, monospace'
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '20px',
      xl: '24px',
      '2xl': '32px',
      '3xl': '40px',
      '4xl': '56px'
    },
    lineHeight: {
      xs: 1.4,
      sm: 1.45,
      base: 1.5,
      lg: 1.4,
      xl: 1.3,
      '2xl': 1.2,
      '3xl': 1.1,
      '4xl': 1.0
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    letterSpacing: {
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em'
    }
  },
  spacing: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
    32: '128px'
  },
  borderRadius: {
    none: '0px',
    sm: '6px',
    md: '12px',
    lg: '20px',
    xl: '24px',
    full: '9999px'
  },
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  },
  motion: {
    duration: {
      fast: '120ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms'
    },
    easing: {
      linear: 'cubic-bezier(0, 0, 1, 1)',
      easeOut: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    }
  },
  component: {
    button: {
      height: {
        sm: '32px',
        default: '40px',
        lg: '48px'
      },
      padding: {
        sm: '8px 12px',
        default: '10px 16px',
        lg: '12px 20px'
      }
    },
    input: {
      height: '40px',
      padding: '8px 12px'
    },
    card: {
      padding: '24px',
      borderRadius: '12px'
    },
    modal: {
      maxWidth: '640px',
      padding: '24px'
    }
  }
} as const;

// Dark theme tokens extend the light theme with inverted neutral and semantic colors
const darkTokens: typeof lightTokens = {
  ...lightTokens,
  color: {
    ...lightTokens.color,
    neutral: {
      50: 'hsl(210 15% 8%)',
      100: 'hsl(210 15% 12%)',
      200: 'hsl(210 15% 22%)',
      300: 'hsl(210 15% 32%)',
      400: 'hsl(210 15% 42%)',
      500: 'hsl(210 15% 55%)',
      600: 'hsl(210 20% 70%)',
      700: 'hsl(210 25% 85%)',
      800: 'hsl(210 30% 92%)',
      900: 'hsl(210 40% 96%)',
      950: 'hsl(210 40% 98%)'
    },
    semantic: {
      ...lightTokens.color.semantic,
      canvasBackground: 'hsl(210 30% 8%)',
      workspaceBackground: 'hsl(0 0% 10%)',
      surfaceElevated: 'hsl(210 15% 20%)',
      borderSubtle: 'hsl(210 15% 30%)',
      borderStrong: 'hsl(210 20% 40%)'
    }
  }
} as const;

export const themes = {
  light: lightTokens,
  dark: darkTokens
} as const;

export type ThemeName = keyof typeof themes;

// Default exported tokens are the light theme for backward compatibility
export const tokens = themes.light;

export const getThemeTokens = (theme: ThemeName) => themes[theme];

export type DesignTokens = typeof lightTokens;
export type MotionConfig = typeof motionConfig;

export default tokens;