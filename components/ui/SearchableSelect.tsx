import React, { useState, useEffect, useRef, useMemo } from 'react';

const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;

export interface SearchableSelectOption {
  value: string;
  label: string;
  [key: string]: any;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  label?: string;
  renderOption?: (option: SearchableSelectOption, isSelected: boolean) => React.ReactNode;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = "Select an option...", label, renderOption, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value]);

  useEffect(() => {
    setInputValue(selectedOption ? selectedOption.label : '');
  }, [selectedOption]);
  
  const filteredOptions = useMemo(() => {
    if (!inputValue || (selectedOption && inputValue === selectedOption.label)) {
      return options;
    }
    const lowercasedInput = inputValue.toLowerCase();
    return options.filter(option => {
        // Search across all string/number properties of the option
        return Object.values(option).some(val => 
            String(val).toLowerCase().includes(lowercasedInput)
        );
    });
  }, [inputValue, options, selectedOption]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setInputValue(selectedOption ? selectedOption.label : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);
  
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
        const activeItem = listRef.current.children[activeIndex] as HTMLLIElement;
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [isOpen, activeIndex]);


  const handleSelect = (option: SearchableSelectOption) => {
    onChange(option.value);
    setInputValue(option.label);
    setIsOpen(false);
    setActiveIndex(-1);
  };
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && activeIndex >= 0 && filteredOptions[activeIndex]) {
          handleSelect(filteredOptions[activeIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setInputValue(selectedOption ? selectedOption.label : '');
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const defaultRenderOption = (option: SearchableSelectOption, isSelected: boolean) => (
    <div className="flex flex-col">
        <span className="font-semibold block truncate">{option.label}</span>
        {option.brand && <span className={`text-xs ${isSelected ? 'text-primary-100' : 'text-secondary-500'}`}>Brand: {option.brand}</span>}
        {option.unit && <span className={`text-xs ${isSelected ? 'text-primary-100' : 'text-secondary-500'}`}>Unit: {option.unit}</span>}
    </div>
  );

  return (
    <div className="w-full" ref={wrapperRef}>
      {label && <label className="block text-sm font-medium text-secondary-700 mb-1">{label}</label>}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value);
            if (!isOpen) setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="block w-full px-3 py-2 bg-secondary-50 border border-secondary-300 text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md disabled:bg-secondary-200 disabled:cursor-not-allowed"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {!disabled && value && (
                 <button type="button" onClick={handleClear} className="p-1 text-secondary-400 hover:text-secondary-600 focus:outline-none">
                    <XIcon />
                </button>
            )}
            <ChevronDownIcon />
        </div>

        {isOpen && !disabled && (
          <ul
            ref={listRef}
            className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`cursor-pointer select-none relative py-2 px-3 ${
                    activeIndex === index ? 'text-white bg-primary-600' : 'text-secondary-900'
                  }`}
                >
                  {renderOption ? renderOption(option, activeIndex === index) : defaultRenderOption(option, activeIndex === index)}
                </li>
              ))
            ) : (
              <li className="cursor-default select-none relative py-2 px-4 text-secondary-700">
                No options found.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SearchableSelect;