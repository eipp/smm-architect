import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { motionVariants } from '../design-system/motion';

// Page transition wrapper
export const PageTransition: React.FC<{
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down' | 'fade';
  duration?: number;
}> = ({ children, direction = 'fade', duration = 0.3 }) => {
  const variants = {
    left: motionVariants.pageSlideLeft,
    right: motionVariants.pageSlideRight,
    up: motionVariants.slideInFromTop,
    down: motionVariants.slideInFromBottom,
    fade: motionVariants.pageFade
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants[direction]}
      transition={{ duration }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

// Route transition manager
export const RouteTransition: React.FC<{
  children: React.ReactNode;
  pathname: string;
  direction?: 'left' | 'right' | 'fade';
}> = ({ children, pathname, direction = 'fade' }) => {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <PageTransition key={pathname} direction={direction}>
        {children}
      </PageTransition>
    </AnimatePresence>
  );
};

// Modal transition wrapper
export const ModalTransition: React.FC<{
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'center' | 'top' | 'bottom';
}> = ({ children, isOpen, onClose, size = 'md', position = 'center' }) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4'
  };

  const positionClasses = {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-16',
    bottom: 'items-end justify-center pb-16'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
            variants={motionVariants.modalBackdrop}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className={`fixed inset-0 z-50 flex ${positionClasses[position]}`}>
            <motion.div
              className={`relative bg-white rounded-lg shadow-xl ${sizeClasses[size]} max-h-[90vh] overflow-hidden`}
              variants={motionVariants.modalEntry}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// Layout transition wrapper
export const LayoutTransition: React.FC<{
  children: React.ReactNode;
  layoutId?: string;
}> = ({ children, layoutId }) => {
  return (
    <motion.div
      layout
      layoutId={layoutId}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 40
      }}
    >
      {children}
    </motion.div>
  );
};

// Stagger container for list animations
export const StaggerContainer: React.FC<{
  children: React.ReactNode;
  staggerDelay?: number;
  delayChildren?: number;
}> = ({ children, staggerDelay = 0.1, delayChildren = 0.1 }) => {
  return (
    <motion.div
      variants={{
        animate: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: delayChildren
          }
        }
      }}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
};

// Individual stagger item
export const StaggerItem: React.FC<{
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade';
}> = ({ children, direction = 'up' }) => {
  const variants = {
    up: motionVariants.staggerItem,
    down: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 }
    },
    left: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 }
    },
    right: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 }
    },
    fade: motionVariants.staggerItemFade
  };

  return (
    <motion.div variants={variants[direction]}>
      {children}
    </motion.div>
  );
};

// Drawer/Sidebar transitions
export const DrawerTransition: React.FC<{
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  side?: 'left' | 'right' | 'top' | 'bottom';
  size?: string;
}> = ({ children, isOpen, onClose, side = 'right', size = '320px' }) => {
  const variants = {
    left: motionVariants.sidebarSlide,
    right: motionVariants.drawerSlide,
    top: {
      initial: { y: '-100%' },
      animate: { y: 0 },
      exit: { y: '-100%' }
    },
    bottom: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' }
    }
  };

  const sizeStyles = {
    left: { width: size, height: '100vh' },
    right: { width: size, height: '100vh' },
    top: { width: '100vw', height: size },
    bottom: { width: '100vw', height: size }
  };

  const positionClasses = {
    left: 'left-0 top-0',
    right: 'right-0 top-0',
    top: 'top-0 left-0',
    bottom: 'bottom-0 left-0'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            className={`fixed ${positionClasses[side]} bg-white shadow-xl z-50`}
            style={sizeStyles[side]}
            variants={variants[side]}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Tab transition wrapper
export const TabTransition: React.FC<{
  children: React.ReactNode;
  activeTab: string;
  direction?: 'horizontal' | 'vertical';
}> = ({ children, activeTab, direction = 'horizontal' }) => {
  const variants = direction === 'horizontal' 
    ? {
        initial: { x: 20, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: -20, opacity: 0 }
      }
    : {
        initial: { y: 20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: -20, opacity: 0 }
      };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Loading transition
export const LoadingTransition: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ isLoading, children, fallback }) => {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {fallback || <div className="animate-pulse">Loading...</div>}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Agent status transition indicators
export const AgentStatusTransition: React.FC<{
  status: 'idle' | 'processing' | 'complete' | 'error';
  agentType?: string;
}> = ({ status, agentType }) => {
  const statusVariants = {
    idle: motionVariants.staggerItem,
    processing: motionVariants.agentProcessing,
    complete: motionVariants.agentComplete,
    error: motionVariants.fieldError
  };

  const statusColors = {
    idle: 'bg-neutral-400',
    processing: 'bg-primary-500',
    complete: 'bg-success-500',
    error: 'bg-error-500'
  };

  return (
    <motion.div
      className={`w-3 h-3 rounded-full ${statusColors[status]}`}
      variants={statusVariants[status]}
      animate="animate"
      aria-label={`${agentType} agent is ${status}`}
    />
  );
};

export default {
  PageTransition,
  RouteTransition,
  ModalTransition,
  LayoutTransition,
  StaggerContainer,
  StaggerItem,
  DrawerTransition,
  TabTransition,
  LoadingTransition,
  AgentStatusTransition
};