import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from '@/contexts/theme-context'

const TestComponent = () => {
  const { theme, setTheme } = useTheme()
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      toggle
    </button>
  )
}

describe('theme switching', () => {
  it('toggles dark mode class on root', async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    const button = screen.getByRole('button')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    await user.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
