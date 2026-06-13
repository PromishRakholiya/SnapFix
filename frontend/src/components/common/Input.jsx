import React from 'react';

const Input = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
  inputClassName = '',
  icon,
  iconPosition = 'left',
  ...props
}) => {
  const inputId = `input-${name}`;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-400 mb-1.5"
        >
          {label}
          {required && <span className="text-danger-400 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-neutral-500">{icon}</span>
          </div>
        )}
        
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`
            w-full px-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-300
            ${icon && iconPosition === 'left' ? 'pl-11' : ''}
            ${icon && iconPosition === 'right' ? 'pr-11' : ''}
            ${error 
              ? 'border-danger-500/40 focus:border-danger-400 focus:ring-danger-500/30 bg-danger-500/10' 
              : 'border-white/[0.1] focus:border-primary-500/50 focus:ring-primary-500/20 bg-white/[0.05] hover:border-white/[0.15] hover:bg-white/[0.07]'
            }
            ${disabled 
              ? 'bg-white/[0.03] text-neutral-600 cursor-not-allowed opacity-70' 
              : 'text-neutral-100 placeholder-neutral-500'
            }
            ${inputClassName}
          `}
          {...props}
        />
        
        {icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-neutral-500">{icon}</span>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-danger-400">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-neutral-500">{helperText}</p>
      )}
    </div>
  );
};

export default Input;
