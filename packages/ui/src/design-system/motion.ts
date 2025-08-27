/**
 * Motion variants for consistent animations across the SMM Architect design system
 * Used with framer-motion for page transitions and component animations
 */

export const motionVariants = {
  // Page transitions
  pageInitial: {
    opacity: 0,
    y: 20,
  },
  pageAnimate: {
    opacity: 1,
    y: 0,
  },
  pageExit: {
    opacity: 0,
    y: -20,
  },

  // Slide transitions
  slideInLeft: {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 100, opacity: 0 },
  },
  slideInRight: {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -100, opacity: 0 },
  },

  // Fade transitions
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  // Scale transitions
  scaleIn: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
  },

  // Stagger children animations
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  },
  staggerItem: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
  },

  // Modal/Dialog animations
  modal: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
  },
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  // Drawer/Sidebar animations
  drawer: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
  },
  drawerRight: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
  },

  // Accordion/Collapse animations
  collapse: {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1 },
    exit: { height: 0, opacity: 0 },
  },

  // Loading/Pulse animations
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        ease: "easeInOut",
        times: [0, 0.5, 1],
        repeat: Infinity,
      },
    },
  },
}

// Common transition configurations
export const transitions = {
  default: {
    type: "tween",
    ease: "easeInOut",
    duration: 0.3,
  },
  fast: {
    type: "tween",
    ease: "easeInOut",
    duration: 0.15,
  },
  slow: {
    type: "tween",
    ease: "easeInOut",
    duration: 0.5,
  },
  spring: {
    type: "spring",
    damping: 25,
    stiffness: 500,
  },
  bouncy: {
    type: "spring",
    damping: 15,
    stiffness: 400,
  },
}

// Animation helper utilities
export const animationHelpers = {
  /**
   * Creates a stagger animation for list items
   */
  createStagger: (delay: number = 0.1) => ({
    animate: {
      transition: {
        staggerChildren: delay,
      },
    },
  }),

  /**
   * Creates a slide animation with custom direction
   */
  createSlide: (direction: 'left' | 'right' | 'up' | 'down', distance: number = 100) => {
    const getInitialPosition = () => {
      switch (direction) {
        case 'left': return { x: -distance, opacity: 0 }
        case 'right': return { x: distance, opacity: 0 }
        case 'up': return { y: -distance, opacity: 0 }
        case 'down': return { y: distance, opacity: 0 }
      }
    }

    return {
      initial: getInitialPosition(),
      animate: { x: 0, y: 0, opacity: 1 },
      exit: getInitialPosition(),
    }
  },
}