import { useState, useRef } from 'react'
import type { KeyboardEvent } from 'react'

interface TagInputProps {
  tags?: string[]
  value?: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  allowDuplicates?: boolean
  disabled?: boolean
  className?: string
  label?: string
  required?: boolean
  'aria-describedby'?: string
  'aria-labelledby'?: string
}

export default function TagInput({
  tags: tagsProp,
  value: valueProp,
  onChange,
  placeholder = 'タグを入力してEnterまたはカンマで追加',
  maxTags,
  allowDuplicates = false,
  disabled = false,
  className = '',
  label,
  required = false,
  'aria-describedby': ariaDescribedBy,
  'aria-labelledby': ariaLabelledBy
}: TagInputProps) {
  // valueまたはtagsプロパティを使用（後方互換性）
  const tags = valueProp || tagsProp || []
  const [inputValue, setInputValue] = useState('')
  const [focusedTagIndex, setFocusedTagIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (!trimmedTag) return

    // Check for duplicates if not allowed
    if (!allowDuplicates && tags.includes(trimmedTag)) return

    // Check max tags limit
    if (maxTags && tags.length >= maxTags) return

    onChange([...tags, trimmedTag])
    setInputValue('')
  }

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove))
    
    // Adjust focus after removal
    if (focusedTagIndex === indexToRemove) {
      setFocusedTagIndex(null)
      inputRef.current?.focus()
    } else if (focusedTagIndex !== null && focusedTagIndex > indexToRemove) {
      setFocusedTagIndex(focusedTagIndex - 1)
    }
  }

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const { key } = e

    if (key === 'Enter' || key === ',') {
      e.preventDefault()
      if (inputValue.includes(',')) {
        // Handle multiple tags separated by commas
        const newTags = inputValue.split(',').map(tag => tag.trim()).filter(tag => tag)
        newTags.forEach(tag => addTag(tag))
      } else {
        addTag(inputValue)
      }
    } else if (key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag when backspace is pressed with empty input
      e.preventDefault()
      removeTag(tags.length - 1)
    } else if (key === 'ArrowLeft' && !inputValue && tags.length > 0) {
      // Focus on last tag when left arrow is pressed with empty input
      e.preventDefault()
      setFocusedTagIndex(tags.length - 1)
    }
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLSpanElement>, index: number) => {
    const { key } = e

    if (key === 'Backspace' || key === 'Delete') {
      e.preventDefault()
      removeTag(index)
    } else if (key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      setFocusedTagIndex(index - 1)
    } else if (key === 'ArrowRight') {
      e.preventDefault()
      if (index < tags.length - 1) {
        setFocusedTagIndex(index + 1)
      } else {
        setFocusedTagIndex(null)
        inputRef.current?.focus()
      }
    } else if (key === 'Escape') {
      e.preventDefault()
      setFocusedTagIndex(null)
      inputRef.current?.focus()
    }
  }

  const handleInputFocus = () => {
    setFocusedTagIndex(null)
  }

  const canAddMoreTags = !maxTags || tags.length < maxTags

  return (
    <div className={`tag-input-container ${className}`}>
      {label && (
        <label 
          className="tag-input-label"
          onClick={() => inputRef.current?.focus()}
        >
          {label}
          {required && <span className="required-asterisk" aria-label="required">*</span>}
        </label>
      )}
      
      <div 
        className={`tag-input-wrapper ${disabled ? 'disabled' : ''} ${focusedTagIndex !== null ? 'tag-focused' : ''}`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className={`tag ${focusedTagIndex === index ? 'focused' : ''}`}
            tabIndex={0}
            role="button"
            aria-label={`タグ: ${tag}. 削除するにはBackspaceまたはDeleteを押してください`}
            onKeyDown={(e) => handleTagKeyDown(e, index)}
            onFocus={() => setFocusedTagIndex(index)}
          >
            <span className="tag-text">{tag}</span>
            <button
              type="button"
              className="tag-remove"
              onClick={(e) => {
                e.stopPropagation()
                removeTag(index)
              }}
              aria-label={`${tag}を削除`}
              disabled={disabled}
            >
              ×
            </button>
          </span>
        ))}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={handleInputFocus}
          placeholder={canAddMoreTags ? placeholder : `最大${maxTags}個まで`}
          disabled={disabled || !canAddMoreTags}
          className="tag-input"
          aria-label={label || 'タグ入力'}
          aria-describedby={ariaDescribedBy}
          aria-labelledby={ariaLabelledBy}
          autoComplete="off"
        />
      </div>
      
      {maxTags && (
        <div className="tag-input-counter" aria-live="polite">
          {tags.length} / {maxTags}
        </div>
      )}
    </div>
  )
}