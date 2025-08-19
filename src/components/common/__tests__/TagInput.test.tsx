import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TagInput from '../TagInput'

describe('TagInput', () => {
  const defaultProps = {
    label: 'Test Tags',
    value: [],
    onChange: jest.fn(),
    placeholder: 'Enter tags'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with label and placeholder', () => {
    render(<TagInput {...defaultProps} />)
    
    expect(screen.getByText('Test Tags')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter tags')).toBeInTheDocument()
  })

  it('displays existing tags', () => {
    const tags = ['tag1', 'tag2', 'tag3']
    render(<TagInput {...defaultProps} value={tags} />)
    
    tags.forEach(tag => {
      expect(screen.getByText(tag)).toBeInTheDocument()
    })
  })

  it('adds tag on Enter key press', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    
    render(<TagInput {...defaultProps} onChange={onChange} />)
    
    const input = screen.getByPlaceholderText('Enter tags')
    await user.type(input, 'newtag{enter}')
    
    expect(onChange).toHaveBeenCalledWith(['newtag'])
  })

  it('adds tag on comma input', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    
    render(<TagInput {...defaultProps} onChange={onChange} />)
    
    const input = screen.getByPlaceholderText('Enter tags')
    await user.type(input, 'newtag,')
    
    expect(onChange).toHaveBeenCalledWith(['newtag'])
  })

  it('prevents duplicate tags', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    const existingTags = ['existing']
    
    render(<TagInput {...defaultProps} value={existingTags} onChange={onChange} />)
    
    const input = screen.getByPlaceholderText('Enter tags')
    await user.type(input, 'existing{enter}')
    
    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes tag when delete button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    const tags = ['tag1', 'tag2']
    
    render(<TagInput {...defaultProps} value={tags} onChange={onChange} />)
    
    const deleteButton = screen.getAllByText('×')[0]
    await user.click(deleteButton)
    
    expect(onChange).toHaveBeenCalledWith(['tag2'])
  })

  it('removes last tag on Backspace when input is empty', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    const tags = ['tag1', 'tag2']
    
    render(<TagInput {...defaultProps} value={tags} onChange={onChange} />)
    
    const input = screen.getByPlaceholderText('Enter tags')
    await user.click(input)
    await user.keyboard('{Backspace}')
    
    expect(onChange).toHaveBeenCalledWith(['tag1'])
  })

  it('handles max tags limit', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    const maxTags = 2
    const existingTags = ['tag1', 'tag2']
    
    render(
      <TagInput 
        {...defaultProps} 
        value={existingTags} 
        onChange={onChange}
        maxTags={maxTags}
      />
    )
    
    const input = screen.getByPlaceholderText('最大2個まで')
    await user.type(input, 'tag3{enter}')
    
    expect(onChange).not.toHaveBeenCalled()
  })

  it('trims whitespace from tags', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    
    render(<TagInput {...defaultProps} onChange={onChange} />)
    
    const input = screen.getByPlaceholderText('Enter tags')
    await user.type(input, '  spaced tag  {enter}')
    
    expect(onChange).toHaveBeenCalledWith(['spaced tag'])
  })

  it('ignores empty tags', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    
    render(<TagInput {...defaultProps} onChange={onChange} />)
    
    const input = screen.getByPlaceholderText('Enter tags')
    await user.type(input, '{enter}')
    
    expect(onChange).not.toHaveBeenCalled()
  })

  it('applies disabled state correctly', () => {
    render(<TagInput {...defaultProps} disabled />)
    
    const input = screen.getByPlaceholderText('Enter tags')
    expect(input).toBeDisabled()
  })
})