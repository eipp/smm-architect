import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ThemeName } from '@/design-system/tokens';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', setTheme: () => {} });

export const ThemeProvider: React.FC<{ children: React.ReactNode; initialTheme?: ThemeName }> = ({
  children,
  initialTheme = 'light',
}) => {
  const [theme, setTheme] = useState<ThemeName>(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
