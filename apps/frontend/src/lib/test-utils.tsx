import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { ReactElement } from 'react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock providers for testing
export const TestProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      {children}
    </div>
  )
}

// Custom render function with providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  return render(ui, {
    wrapper: TestProviders,
    ...options,
  })
}

// Accessibility testing helper
export const expectToBeAccessible = async (container: HTMLElement) => {
  const results = await axe(container)
  expect(results).toHaveNoViolations()
}

// User event helper with better defaults
export const userEventSetup = (options?: Parameters<typeof userEvent.setup>[0]) => {
  return userEvent.setup({
    delay: null, // No delay by default in tests
    ...options,
  })
}

// Common test patterns
export const testUtils = {
  // Test keyboard navigation
  testKeyboardNavigation: async (container: HTMLElement) => {
    const user = userEventSetup()
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    expect(focusableElements.length).toBeGreaterThan(0)
    
    // Tab through elements
    for (let i = 0; i < focusableElements.length; i++) {
      await user.tab()
      expect(focusableElements[i]).toHaveFocus()
    }
  },

  // Test component with all variants
  testAllVariants: async (
    Component: React.ComponentType<any>,
    baseProps: any,
    variants: Record<string, any[]>
  ) => {
    const variantKeys = Object.keys(variants)
    const variantCombinations: any[] = []
    
    // Generate all combinations
    const generateCombinations = (index: number, current: any) => {
      if (index === variantKeys.length) {
        variantCombinations.push({ ...current })
        return
      }
      
      const key = variantKeys[index]
      for (const value of variants[key]) {
        generateCombinations(index + 1, { ...current, [key]: value })
      }
    }
    
    generateCombinations(0, {})
    
    // Test each combination
    for (const variant of variantCombinations) {
      const props = { ...baseProps, ...variant }
      const { container, unmount } = renderWithProviders(<Component {...props} />)
      
      // Basic render test
      expect(container.firstChild).toBeInTheDocument()
      
      // Accessibility test
      await expectToBeAccessible(container)
      
      unmount()
    }
  },

  // Test responsive behavior
  testResponsive: (Component: React.ComponentType<any>, props: any) => {
    const viewports = [
      { width: 320, height: 568 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1024, height: 768 }, // Desktop
      { width: 1440, height: 900 }, // Large desktop
    ]
    
    viewports.forEach(viewport => {
      // Mock window.innerWidth and innerHeight
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: viewport.width,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: viewport.height,
      })
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'))
      
      const { container, unmount } = renderWithProviders(<Component {...props} />)
      expect(container.firstChild).toBeInTheDocument()
      unmount()
    })
  },

  // Test error boundaries
  testErrorBoundary: (
    Component: React.ComponentType<any>,
    props: any,
    ErrorBoundary?: React.ComponentType<any>
  ) => {
    // Mock console.error to prevent error output in tests
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    // Component that throws an error
    const ThrowError = () => {
      throw new Error('Test error')
    }
    
    const TestComponent = ErrorBoundary || TestProviders
    
    const { container } = renderWithProviders(
      <TestComponent>
        <Component {...props}>
          <ThrowError />
        </Component>
      </TestComponent>
    )
    
    // Should render error boundary fallback or handle error gracefully
    expect(container).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  },

  // Test loading states
  testLoadingStates: async (
    Component: React.ComponentType<any>,
    props: any,
    loadingProps: any
  ) => {
    // Test loading state
    const { container: loadingContainer, rerender } = renderWithProviders(
      <Component {...props} {...loadingProps} />
    )
    
    // Should show loading indicator
    expect(loadingContainer.querySelector('[data-testid*="loading"], .loading')).toBeInTheDocument()
    
    // Test loaded state
    rerender(<Component {...props} />)
    expect(loadingContainer.querySelector('[data-testid*="loading"], .loading')).not.toBeInTheDocument()
  },

  // Test form validation
  testFormValidation: async (
    FormComponent: React.ComponentType<any>,
    props: any,
    validationScenarios: Array<{
      input: Record<string, string>
      expectedErrors: string[]
    }>
  ) => {
    for (const scenario of validationScenarios) {
      const user = userEventSetup()
      const { container, unmount } = renderWithProviders(<FormComponent {...props} />)
      
      // Fill form with test data
      for (const [fieldName, value] of Object.entries(scenario.input)) {
        const field = container.querySelector(`[name="${fieldName}"]`) as HTMLElement
        if (field) {
          await user.clear(field)
          await user.type(field, value)
        }
      }
      
      // Submit form
      const submitButton = container.querySelector('[type="submit"]') as HTMLElement
      if (submitButton) {
        await user.click(submitButton)
      }
      
      // Check for expected errors
      for (const expectedError of scenario.expectedErrors) {
        expect(container).toHaveTextContent(expectedError)
      }
      
      unmount()
    }
  },

  // Mock API responses
  mockApiResponse: (url: string, response: any, status = 200) => {
    return jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
    })
  },

  // Wait for async operations
  waitForAsync: async (fn: () => Promise<void>, timeout = 5000) => {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      try {
        await fn()
        return
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    throw new Error(`Async operation timed out after ${timeout}ms`)
  },
}

// Re-export testing library utilities
export * from '@testing-library/react'
export { userEvent }
export { axe, toHaveNoViolations }