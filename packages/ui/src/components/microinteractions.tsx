import React from 'react';

// Success celebration components
export const SuccessConfetti: React.FC<{ trigger: boolean; onComplete?: () => void }> = ({ 
  trigger, 
  onComplete 
}) => {
  React.useEffect(() => {
    if (trigger) {
      const timer = setTimeout(() => onComplete?.(), 800);
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  if (!trigger) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-primary-500 rounded-full animate-confetti"
          style={{
            left: `${20 + Math.random() * 60}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${0.6 + Math.random() * 0.4}s`
          }}
        />
      ))}
    </div>
  );
};

export const SuccessCheckmark: React.FC<{ visible: boolean; size?: 'sm' | 'md' | 'lg' }> = ({ 
  visible, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`${sizeClasses[size]} relative`}>
      <svg
        className={`w-full h-full text-success-500 transition-all duration-300 ${
          visible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
          className={visible ? 'animate-draw-check' : ''}
        />
      </svg>
    </div>
  );
};

// Ripple effect hook and component
export const useRipple = () => {
  const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([]);

  const addRipple = React.useCallback((event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now();

    setRipples(prev => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id));
    }, 600);
  }, []);

  const RippleContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="relative overflow-hidden" onClick={addRipple}>
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute animate-ripple bg-white bg-opacity-30 rounded-full pointer-events-none"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
          }}
        />
      ))}
    </div>
  );

  return { addRipple, RippleContainer };
};

// Loading states with microinteractions
export const PulseLoader: React.FC<{ active: boolean; size?: 'sm' | 'md' | 'lg' }> = ({ 
  active, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  if (!active) return null;

  return (
    <div className="flex space-x-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={`${sizeClasses[size]} bg-current rounded-full animate-pulse`}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
};

export const ShimmerLoader: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-shimmer bg-gradient-to-r from-neutral-300 via-neutral-200 to-neutral-300 bg-[length:400%_100%] ${className}`} />
);

// Interactive feedback components
export const HoverGlow: React.FC<{ 
  children: React.ReactNode; 
  color?: 'primary' | 'success' | 'warning' | 'error';
  intensity?: 'subtle' | 'medium' | 'strong';
}> = ({ children, color = 'primary', intensity = 'medium' }) => {
  const colorClasses = {
    primary: 'hover:shadow-primary-500/25',
    success: 'hover:shadow-success-500/25',
    warning: 'hover:shadow-warning-500/25',
    error: 'hover:shadow-error-500/25'
  };

  const intensityClasses = {
    subtle: 'hover:shadow-sm',
    medium: 'hover:shadow-md',
    strong: 'hover:shadow-lg'
  };

  return (
    <div className={`transition-shadow duration-200 ${colorClasses[color]} ${intensityClasses[intensity]}`}>
      {children}
    </div>
  );
};

export const ScaleOnHover: React.FC<{ 
  children: React.ReactNode; 
  scale?: 'subtle' | 'normal' | 'strong';
}> = ({ children, scale = 'normal' }) => {
  const scaleClasses = {
    subtle: 'hover:scale-[1.01]',
    normal: 'hover:scale-105',
    strong: 'hover:scale-110'
  };

  return (
    <div className={`transition-transform duration-200 ${scaleClasses[scale]}`}>
      {children}
    </div>
  );
};

// Form interaction enhancements
export const FocusRing: React.FC<{ 
  children: React.ReactNode; 
  color?: 'primary' | 'success' | 'warning' | 'error';
}> = ({ children, color = 'primary' }) => {
  const colorClasses = {
    primary: 'focus-within:ring-primary-500/20',
    success: 'focus-within:ring-success-500/20',
    warning: 'focus-within:ring-warning-500/20',
    error: 'focus-within:ring-error-500/20'
  };

  return (
    <div className={`transition-all duration-200 focus-within:ring-4 ${colorClasses[color]}`}>
      {children}
    </div>
  );
};

export const ShakeOnError: React.FC<{ 
  children: React.ReactNode; 
  trigger: boolean;
  onComplete?: () => void;
}> = ({ children, trigger, onComplete }) => {
  const [isShaking, setIsShaking] = React.useState(false);

  React.useEffect(() => {
    if (trigger) {
      setIsShaking(true);
      const timer = setTimeout(() => {
        setIsShaking(false);
        onComplete?.();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  return (
    <div className={isShaking ? 'animate-shake' : ''}>
      {children}
    </div>
  );
};

// Progress and status indicators
export const ProgressRing: React.FC<{ 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  color?: 'primary' | 'success' | 'warning' | 'error';
}> = ({ progress, size = 40, strokeWidth = 3, color = 'primary' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const colorClasses = {
    primary: 'stroke-primary-500',
    success: 'stroke-success-500',
    warning: 'stroke-warning-500',
    error: 'stroke-error-500'
  };

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="transparent"
        className="text-neutral-200"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={`transition-all duration-300 ${colorClasses[color]}`}
      />
    </svg>
  );
};

// Notification and alert animations
export const SlideInNotification: React.FC<{ 
  children: React.ReactNode; 
  visible: boolean;
  direction?: 'top' | 'right' | 'bottom' | 'left';
}> = ({ children, visible, direction = 'right' }) => {
  const directionClasses = {
    top: visible ? 'translate-y-0' : '-translate-y-full',
    right: visible ? 'translate-x-0' : 'translate-x-full',
    bottom: visible ? 'translate-y-0' : 'translate-y-full',
    left: visible ? 'translate-x-0' : '-translate-x-full'
  };

  return (
    <div className={`transition-transform duration-300 ease-out ${directionClasses[direction]} ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  );
};

// CSS animations to add to global styles
export const microinteractionStyles = `
@keyframes confetti {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
}

@keyframes draw-check {
  0% { stroke-dasharray: 0 100; }
  100% { stroke-dasharray: 100 0; }
}

@keyframes ripple {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(4); opacity: 0; }
}

@keyframes shimmer {
  0% { background-position: -400% 0; }
  100% { background-position: 400% 0; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}

.animate-confetti { animation: confetti ease-out forwards; }
.animate-draw-check { animation: draw-check 0.5s ease-out; }
.animate-ripple { animation: ripple 0.6s ease-out; }
.animate-shimmer { animation: shimmer 2s ease-in-out infinite; }
.animate-shake { animation: shake 0.4s ease-in-out; }
`;

export default {
  SuccessConfetti,
  SuccessCheckmark,
  useRipple,
  PulseLoader,
  ShimmerLoader,
  HoverGlow,
  ScaleOnHover,
  FocusRing,
  ShakeOnError,
  ProgressRing,
  SlideInNotification,
  microinteractionStyles
};