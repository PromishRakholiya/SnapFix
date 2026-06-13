import React from 'react';

const Select = ({ 
  label, 
  name, 
  value, 
  onChange, 
  error, 
  children, 
  required = false,
  disabled = false,
  className = '',
  ...props 
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-neutral-400 mb-2">
          {label}
          {required && <span className="text-danger-400 ml-1">*</span>}
        </label>
      )}
      
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-full px-3 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-all
          ${error 
            ? 'border-danger-500/40 text-danger-400 focus:ring-danger-500/30 focus:border-danger-400' 
            : 'border-white/[0.1] text-neutral-100'
          }
          ${disabled ? 'bg-white/[0.02] cursor-not-allowed opacity-60' : 'bg-white/[0.05] hover:bg-white/[0.07]'}
        `}
        {...props}
      >
        {children}
      </select>
      
      {error && (
        <p className="mt-1 text-sm text-danger-400">{error}</p>
      )}
    </div>
  );
};

export default Select;
