import React, { useState, useEffect, useRef } from 'react';
import { Input, Tooltip } from 'antd';

const CostPerDayInput = ({ 
  value, 
  onChange, 
  drugInfo, 
  placeholder = "e.g. 5.50 or =0.1*3*2 (press Tab/Enter/Space to calculate)",
  style = { width: '100%' },
  ...props 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastValidExpression, setLastValidExpression] = useState('');
  const debounceTimer = useRef(null);
  const onChangeTimer = useRef(null);
  const isCalculatingRef = useRef(false);
  const isInitialized = useRef(false);
  const inputRef = useRef(null);

  // Initialize with value only once
  useEffect(() => {
    if (!isInitialized.current && value !== undefined) {
      setInputValue(String(value || ''));
      isInitialized.current = true;
    }
  }, [value]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (onChangeTimer.current) {
        clearTimeout(onChangeTimer.current);
      }
    };
  }, []);

  const evaluateExpression = (expression) => {
    if (!expression || typeof expression !== 'string') return null;
    
    // Only evaluate if expression starts with '='
    if (!expression.startsWith('=')) return null;
    
    try {
      // Remove the '=' prefix and any non-mathematical characters except numbers, operators, and parentheses
      const cleanExpression = expression.substring(1).replace(/[^0-9+\-*/().\s]/g, '').trim();
      
      if (!cleanExpression) return null;
      
      // Use Function constructor for safe evaluation
      const result = Function('"use strict"; return (' + cleanExpression + ')')();
      
      return isNaN(result) ? null : parseFloat(result);
    } catch (error) {
      return null;
    }
  };

  const debouncedOnChange = (value) => {
    // Clear any existing onChange timer
    if (onChangeTimer.current) {
      clearTimeout(onChangeTimer.current);
    }
    
    // Debounce onChange calls to prevent excessive form updates
    onChangeTimer.current = setTimeout(() => {
      onChange?.(value);
    }, 100);
  };

  const triggerCalculation = () => {
    const stringValue = String(inputValue);
    if (inputValue && stringValue.startsWith('=') && stringValue.length > 1) {
      const evaluated = evaluateExpression(inputValue);
      if (evaluated !== null && evaluated >= 0) {
        setInputValue(evaluated.toString());
        onChange?.(evaluated);
        setIsCalculating(false);
        isCalculatingRef.current = false;
        return true; // Calculation was successful
      }
    }
    return false; // No calculation was performed
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (!newValue) {
      // Clear any pending timers
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      if (onChangeTimer.current) {
        clearTimeout(onChangeTimer.current);
        onChangeTimer.current = null;
      }
      isCalculatingRef.current = false;
      // Only call onChange when clearing the input
      onChange?.(null);
      return;
    }

    // Clear any existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Check if it's a valid expression (starts with '=') for auto-calculation
    const evaluated = evaluateExpression(newValue);
    if (evaluated !== null && evaluated >= 0) {
      setIsCalculating(true);
      isCalculatingRef.current = true;
      setLastValidExpression(newValue);
      
      // No automatic evaluation - only manual triggers will calculate
    } else {
      // If it's not a calculation expression, treat as normal input
      setIsCalculating(false);
      isCalculatingRef.current = false;
      // For non-calculation inputs, use debounced onChange to prevent focus loss
      if (!String(newValue).startsWith('=')) {
        debouncedOnChange(newValue);
      }
      // For calculation expressions that aren't complete yet, don't call onChange
      // This prevents form re-renders that cause focus loss
    }
  };

  const handleBlur = () => {
    // Clear any pending timers
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    if (onChangeTimer.current) {
      clearTimeout(onChangeTimer.current);
      onChangeTimer.current = null;
    }
    
    // Try to trigger calculation on blur
    const calculationPerformed = triggerCalculation();
    
    if (!calculationPerformed) {
      // If no calculation was performed, handle as normal input
      const stringValue = String(inputValue);
      if (inputValue && !stringValue.startsWith('=')) {
        // For non-calculation inputs, ensure the value is passed to parent
        onChange?.(inputValue);
      } else if (inputValue && stringValue.startsWith('=')) {
        // For incomplete calculation expressions, treat as regular string
        onChange?.(inputValue);
      }
    }
    
    setIsCalculating(false);
    isCalculatingRef.current = false;
  };

  const handleFocus = () => {
    // On focus, show the original expression if it was a calculation
    if (lastValidExpression && value && typeof value === 'number') {
      setInputValue(lastValidExpression);
    }
  };

  const handleKeyPress = (e) => {
    // Handle manual calculation triggers
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ' ') {
      // Clear any pending timers
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      if (onChangeTimer.current) {
        clearTimeout(onChangeTimer.current);
        onChangeTimer.current = null;
      }
      
      // Try to trigger calculation
      const calculationPerformed = triggerCalculation();
      
      if (!calculationPerformed) {
        // If no calculation was performed, handle as normal
        if (e.key === 'Enter') {
          handleBlur();
        }
        // For Tab and Space, let them proceed normally
      } else {
        // If calculation was performed, prevent default behavior for Enter and Space
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
        }
      }
    }
  };

  const inputElement = (
    <Input
      {...props}
      ref={inputRef}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyPress={handleKeyPress}
      style={style}
      placeholder={placeholder}
      addonBefore="RM"
    />
  );

  return (
    <Tooltip 
      title={String(inputValue).startsWith('=') ? "Press Tab/Enter/Space to calculate" : ""}
      placement="topRight"
    >
      {inputElement}
    </Tooltip>
  );
};

export default CostPerDayInput;
