import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '../Button'

describe('Button', () => {
  it('renders button with children', () => {
    render(<Button>Test Button</Button>)
    
    const button = screen.getByRole('button', { name: 'Test Button' })
    expect(button).toBeInTheDocument()
  })

  it('handles onClick event', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: 'Click me' })
    await user.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    
    let button = screen.getByRole('button', { name: 'Primary' })
    expect(button).toHaveClass('btn', 'btn-primary')
    
    rerender(<Button variant="secondary">Secondary</Button>)
    button = screen.getByRole('button', { name: 'Secondary' })
    expect(button).toHaveClass('btn', 'btn-secondary')
    
    rerender(<Button variant="danger">Danger</Button>)
    button = screen.getByRole('button', { name: 'Danger' })
    expect(button).toHaveClass('btn', 'btn-danger')
  })

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    
    let button = screen.getByRole('button', { name: 'Small' })
    expect(button).toHaveClass('btn', 'btn-primary', 'btn-sm')
    
    rerender(<Button size="lg">Large</Button>)
    button = screen.getByRole('button', { name: 'Large' })
    expect(button).toHaveClass('btn', 'btn-primary', 'btn-lg')
    
    rerender(<Button size="md">Medium</Button>)
    button = screen.getByRole('button', { name: 'Medium' })
    expect(button).toHaveClass('btn', 'btn-primary', 'btn-md')
  })

  it('shows loading state correctly', () => {
    render(<Button isLoading>Loading Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('btn', 'btn-primary', 'btn-md', 'btn-loading')
    expect(button).toBeDisabled()
    expect(button.querySelector('.spinner')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>)
    
    const button = screen.getByRole('button', { name: 'Disabled Button' })
    expect(button).toBeDisabled()
  })

  it('does not call onClick when disabled', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick} disabled>Disabled</Button>)
    
    const button = screen.getByRole('button', { name: 'Disabled' })
    await user.click(button)
    
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    const customClass = 'custom-button'
    render(<Button className={customClass}>Custom</Button>)
    
    const button = screen.getByRole('button', { name: 'Custom' })
    expect(button).toHaveClass('btn', customClass)
  })

  it('passes through HTML button attributes', () => {
    render(
      <Button type="submit" data-testid="submit-button">
        Submit
      </Button>
    )
    
    const button = screen.getByTestId('submit-button')
    expect(button).toHaveAttribute('type', 'submit')
  })
})