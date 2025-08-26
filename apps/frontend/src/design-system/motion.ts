import { motionConfig } from './tokens';

// Respect user's motion preferences
export const getMotionConfig = () => {
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  if (prefersReducedMotion) {
    return {
      pop: { duration: 0.01 },
      gentle: { duration: 0.01 },
      bouncy: { duration: 0.01 },
      fade: { duration: 0.01 }
    };
  }

  return motionConfig;
};

// Pre-defined motion variants for common interactions
export const motionVariants = {
  // Button interactions
  buttonPress: {
    whileTap: { 
      scale: 0.98,
      transition: motionConfig.fade
    },
    whileHover: { 
      scale: 1.02,
      transition: motionConfig.fade
    }
  },
  
  // Card hover elevation
  cardHover: {
    whileHover: {
      y: -4,
      boxShadow: \"0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)\",
      transition: motionConfig.gentle
    }
  },

  // Modal entry
  modalEntry: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: motionConfig.pop
  },

  // Slide transitions
  slideInFromTop: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
    transition: motionConfig.gentle
  },

  slideInFromBottom: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
    transition: motionConfig.gentle
  },

  // Success celebrations
  successPulse: {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 0.6,
        ease: \"easeInOut\"
      }
    }
  },

  // Loading states
  pulse: {
    animate: {
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: \"easeInOut\"
      }
    }
  },

  // List and stagger animations
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  },

  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 30
      }
    }
  },

  staggerItemFade: {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
    }
  },

  // Form field animations
  fieldFocus: {
    whileFocus: {
      scale: 1.02,
      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
      transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
    }
  },

  fieldError: {
    animate: {
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 }
    }
  },

  // Canvas and workspace animations
  nodeAppear: {
    initial: { scale: 0, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 600,
        damping: 40
      }
    }
  },

  nodeHover: {
    whileHover: {
      scale: 1.05,
      boxShadow: "0 8px 25px -8px rgba(0, 0, 0, 0.3)",
      transition: { duration: 0.2 }
    }
  },

  edgeGrow: {
    initial: { pathLength: 0, opacity: 0 },
    animate: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 1, ease: "easeInOut" }
    }
  },

  // Drawer and sidebar animations
  drawerSlide: {
    initial: { x: "100%" },
    animate: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 40
      }
    },
    exit: {
      x: "100%",
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    }
  },

  sidebarSlide: {
    initial: { x: "-100%" },
    animate: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 40
      }
    },
    exit: {
      x: "-100%",
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    }
  }
};

// Spring configurations for different use cases
export const springs = {
  gentle: motionConfig.gentle,
  pop: motionConfig.pop,
  bouncy: motionConfig.bouncy
};

// Duration presets
export const durations = {
  fast: 0.12,
  normal: 0.2,
  slow: 0.3,
  slower: 0.5
};

// Easing functions
export const easings = {
  easeOut: [0.2, 0.9, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  spring: [0.34, 1.56, 0.64, 1]
} as const;

export default {
  getMotionConfig,
  motionVariants,
  springs,
  durations,
  easings
};