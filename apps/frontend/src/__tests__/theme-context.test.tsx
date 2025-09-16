import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/contexts/theme-context';

describe('ThemeProvider', () => {
  it('switches between light and dark themes', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(document.documentElement.dataset.theme).toBe('light');
    act(() => result.current.setTheme('dark'));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
