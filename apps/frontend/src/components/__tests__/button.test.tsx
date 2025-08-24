import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@smm-architect/ui'

describe('Button', () => {
  it('renders with correct variant classes', () => {
    render(<Button variant=\"outline\">Test Button</Button>)
    expect(screen.getByRole('button')).toHaveClass('border border-input')
  })
  
  it('renders with default variant when no variant specified', () => {
    render(<Button>Default Button</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary text-primary-foreground')
  })
  
  it('handles loading state correctly', () => {
    render(<Button loading>Submit</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Submit')
    // Check for loading spinner
    expect(button.querySelector('.animate-spin')).toBeInTheDocument()
  })
  
  it('calls onClick handler when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
  
  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    
    render(<Button onClick={handleClick} disabled>Disabled</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })
  
  it('does not call onClick when loading', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    
    render(<Button onClick={handleClick} loading>Loading</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })
  
  it('applies size variants correctly', () => {
    const { rerender } = render(<Button size=\"sm\">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-9 px-3')
    
    rerender(<Button size=\"lg\">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-11 px-8')
    
    rerender(<Button size=\"icon\">Icon</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-10 w-10')
  })
  
  it('supports asChild prop with Slot', () => {
    render(
      <Button asChild>
        <a href=\"/test\">Link Button</a>
      </Button>
    )
    
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/test')
    expect(link).toHaveClass('bg-primary text-primary-foreground')
  })
  
  it('has proper accessibility attributes', () => {
    render(<Button aria-label=\"Custom label\">Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Custom label')
  })
  
  it('maintains focus management', async () => {
    const user = userEvent.setup()
    
    render(<Button>Focus me</Button>)
    
    const button = screen.getByRole('button')
    await user.tab()
    
    expect(button).toHaveFocus()
    expect(button).toHaveClass('focus-visible:ring-2')
  })
})"