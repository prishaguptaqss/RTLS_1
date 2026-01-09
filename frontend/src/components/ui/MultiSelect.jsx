import React, { useState, useRef, useEffect } from 'react';
import './MultiSelect.css';

/**
 * MultiSelect Component
 *
 * A dropdown component that allows selecting multiple options.
 * Shows selected items as badges with remove buttons.
 *
 * Props:
 * - options: Array of {value, label} objects
 * - value: Array of selected values
 * - onChange: Callback when selection changes (receives array of values)
 * - placeholder: Placeholder text when nothing selected
 * - disabled: Disable the component
 * - maxHeight: Max height of dropdown (default: 200px)
 */
const MultiSelect = ({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select options...',
  disabled = false,
  maxHeight = '200px'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchTerm('');
    }
  };

  const handleSelect = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const handleRemove = (optionValue, e) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== optionValue));
  };

  const getSelectedLabels = () => {
    return value
      .map(v => options.find(opt => opt.value === v))
      .filter(opt => opt)
      .map(opt => opt.label);
  };

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`multiselect-container ${disabled ? 'disabled' : ''}`} ref={containerRef}>
      <div className="multiselect-input" onClick={toggleDropdown}>
        <div className="multiselect-tags">
          {value.length === 0 ? (
            <span className="multiselect-placeholder">{placeholder}</span>
          ) : (
            getSelectedLabels().map((label, index) => (
              <span key={value[index]} className="multiselect-tag">
                {label}
                <button
                  type="button"
                  className="multiselect-tag-remove"
                  onClick={(e) => handleRemove(value[index], e)}
                  disabled={disabled}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
        <span className={`multiselect-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>

      {isOpen && (
        <div className="multiselect-dropdown" style={{ maxHeight }}>
          <div className="multiselect-search">
            <input
              ref={searchInputRef}
              type="text"
              className="multiselect-search-input"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="multiselect-options">
            {filteredOptions.length === 0 ? (
              <div className="multiselect-option-empty">No options available</div>
            ) : (
              filteredOptions.map(option => (
                <div
                  key={option.value}
                  className={`multiselect-option ${value.includes(option.value) ? 'selected' : ''}`}
                  onClick={() => handleSelect(option.value)}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(option.value)}
                    onChange={() => {}} // Handled by parent div onClick
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="multiselect-option-label">{option.label}</span>
                </div>
              ))
            )}
          </div>

          {value.length > 0 && (
            <div className="multiselect-footer">
              <button
                type="button"
                className="multiselect-clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
              >
                Clear All ({value.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
