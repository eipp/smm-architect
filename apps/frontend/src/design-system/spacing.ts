import { tokens } from './tokens';

// 8px baseline grid system
export const spacing = tokens.spacing;

// Responsive breakpoints aligned with Tailwind defaults
export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Grid system utilities
export const grid = {
  // Container max-widths for different breakpoints
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Standard grid columns
  columns: {
    1: '1fr',
    2: 'repeat(2, 1fr)',
    3: 'repeat(3, 1fr)',
    4: 'repeat(4, 1fr)',
    6: 'repeat(6, 1fr)',
    12: 'repeat(12, 1fr)',
  },
  
  // Gap utilities based on spacing tokens
  gap: {
    none: spacing[0],
    xs: spacing[1], // 4px
    sm: spacing[2], // 8px
    md: spacing[4], // 16px
    lg: spacing[6], // 24px
    xl: spacing[8], // 32px
    '2xl': spacing[12], // 48px
  },
};

// Component sizing standards
export const componentSizing = {
  // Button heights
  button: {
    sm: tokens.component.button.height.sm, // 32px
    default: tokens.component.button.height.default, // 40px
    lg: tokens.component.button.height.lg, // 48px
  },
  
  // Input heights
  input: {
    sm: '32px',
    default: tokens.component.input.height, // 40px
    lg: '48px',
  },
  
  // Card padding
  card: {
    padding: tokens.component.card.padding, // 24px
    borderRadius: tokens.component.card.borderRadius, // 12px
  },
  
  // Modal sizing
  modal: {
    maxWidth: tokens.component.modal.maxWidth, // 640px
    padding: tokens.component.modal.padding, // 24px
  },
  
  // Canvas and workspace elements
  canvas: {
    nodeSize: '120px',
    nodeGap: spacing[6], // 24px
    gridSize: spacing[6], // 24px for snap-to-grid
    toolbarHeight: '56px',
    sidebarWidth: '280px',
    inspectorWidth: '320px',
  },
  
  // Navigation and layout
  navigation: {
    height: '64px',
    sidebarWidth: '240px',
    mobileMenuHeight: '100vh',
  },
  
  // Content areas
  content: {
    maxWidth: '1200px',
    padding: {
      mobile: spacing[4], // 16px
      tablet: spacing[6], // 24px
      desktop: spacing[8], // 32px
    },
  },
};

// Layout utilities
export const layout = {
  // Flexbox utilities
  flex: {
    center: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    between: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    start: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    end: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    column: {
      display: 'flex',
      flexDirection: 'column' as const,
    },
    columnCenter: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
  
  // Grid utilities
  gridLayouts: {
    // Two-column layout
    twoColumn: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: spacing[6],
    },
    
    // Three-column layout
    threeColumn: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: spacing[6],
    },
    
    // Sidebar layout
    sidebar: {
      display: 'grid',
      gridTemplateColumns: '240px 1fr',
      gap: spacing[6],
    },
    
    // Dashboard layout
    dashboard: {
      display: 'grid',
      gridTemplateColumns: '280px 1fr 320px',
      gap: spacing[6],
      minHeight: '100vh',
    },
    
    // Card grid
    cardGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: spacing[6],
    },
  },
};

// Responsive spacing utilities
export const createResponsiveSpacing = (config: {
  mobile: keyof typeof spacing;
  tablet?: keyof typeof spacing;
  desktop?: keyof typeof spacing;
}) => {
  const { mobile, tablet, desktop } = config;
  
  return {
    padding: spacing[mobile],
    '@media (min-width: 768px)': {
      padding: spacing[tablet || mobile],
    },
    '@media (min-width: 1024px)': {
      padding: spacing[desktop || tablet || mobile],
    },
  };
};

// Aspect ratio utilities
export const aspectRatio = {
  square: '1 / 1',
  video: '16 / 9',
  photo: '4 / 3',
  golden: '1.618 / 1',
  portrait: '3 / 4',
  wide: '21 / 9',
};

// Z-index scale
export const zIndex = {
  base: 0,
  raised: 1,
  dropdown: 10,
  overlay: 20,
  modal: 30,
  popover: 40,
  tooltip: 50,
  toast: 60,
  menu: 70,
  nav: 80,
  loading: 90,
  max: 999,
};

// Common layout patterns for SMM Architect
export const layoutPatterns = {
  // Workspace canvas layout
  workspaceCanvas: {
    display: 'grid',
    gridTemplateColumns: `${componentSizing.canvas.sidebarWidth} 1fr ${componentSizing.canvas.inspectorWidth}`,
    gridTemplateRows: `${componentSizing.navigation.height} 1fr`,
    height: '100vh',
    overflow: 'hidden',
  },
  
  // Agent orchestration timeline
  agentTimeline: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[4],
    padding: spacing[6],
    maxWidth: '800px',
  },
  
  // Decision card layout
  decisionCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[4],
    padding: spacing[6],
    width: '100%',
    maxWidth: '400px',
  },
  
  // Simulation dashboard
  simulationDashboard: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: 'auto 1fr auto',
    gap: spacing[6],
    padding: spacing[6],
    height: '100%',
  },
  
  // Content editor layout
  contentEditor: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing[6],
    padding: spacing[6],
    minHeight: '600px',
  },
  
  // Policy viewer layout
  policyViewer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[4],
    padding: spacing[6],
    maxWidth: '700px',
  },
};

// Responsive container utilities
export const containers = {
  // Full width container
  full: {
    width: '100%',
    margin: '0 auto',
  },
  
  // Centered container with max width
  centered: {
    width: '100%',
    maxWidth: componentSizing.content.maxWidth,
    margin: '0 auto',
    padding: `0 ${componentSizing.content.padding.mobile}`,
    '@media (min-width: 768px)': {
      padding: `0 ${componentSizing.content.padding.tablet}`,
    },
    '@media (min-width: 1024px)': {
      padding: `0 ${componentSizing.content.padding.desktop}`,
    },
  },
  
  // Narrow container for reading content
  narrow: {
    width: '100%',
    maxWidth: '65ch',
    margin: '0 auto',
    padding: `0 ${spacing[4]}`,
  },
  
  // Wide container for dashboards
  wide: {
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: `0 ${spacing[6]}`,
  },
};

// Utility function to create consistent spacing
export const createSpacing = (multiplier: number) => {
  const baseUnit = 8; // 8px base unit
  return `${baseUnit * multiplier}px`;
};

// Utility function to create responsive grid
export const createResponsiveGrid = (config: {
  mobile: number;
  tablet?: number;
  desktop?: number;
  gap?: keyof typeof spacing;
}) => {
  const { mobile, tablet, desktop, gap = 'md' } = config;
  
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${mobile}, 1fr)`,
    gap: spacing[gap],
    '@media (min-width: 768px)': {
      gridTemplateColumns: `repeat(${tablet || mobile}, 1fr)`,
    },
    '@media (min-width: 1024px)': {
      gridTemplateColumns: `repeat(${desktop || tablet || mobile}, 1fr)`,
    },
  };
};

export default {
  spacing,
  breakpoints,
  grid,
  componentSizing,
  layout,
  createResponsiveSpacing,
  aspectRatio,
  zIndex,
  layoutPatterns,
  containers,
  createSpacing,
  createResponsiveGrid,
};