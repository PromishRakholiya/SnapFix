import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-black focus:ring-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40',
    secondary: 'bg-white/[0.08] hover:bg-white/[0.12] text-neutral-200 border border-white/[0.1] focus:ring-white/20',
    success: 'bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white focus:ring-success-500 shadow-lg shadow-success-500/20 hover:shadow-success-500/40',
    warning: 'bg-gradient-to-r from-warning-500 to-warning-600 hover:from-warning-600 hover:to-warning-700 text-black focus:ring-warning-500 shadow-lg shadow-warning-500/20 hover:shadow-warning-500/40',
    danger: 'bg-gradient-to-r from-danger-500 to-danger-600 hover:from-danger-600 hover:to-danger-700 text-white focus:ring-danger-500 shadow-lg shadow-danger-500/20 hover:shadow-danger-500/40',
    outline: 'border-2 border-primary-500/30 text-primary-400 hover:bg-primary-500/10 hover:border-primary-500/50 focus:ring-primary-500 bg-transparent backdrop-blur-sm',
    'outline-danger': 'border-2 border-danger-500/30 text-danger-400 hover:bg-danger-500/10 hover:border-danger-500/50 focus:ring-danger-500 bg-transparent backdrop-blur-sm',
    'outline-success': 'border-2 border-success-500/30 text-success-400 hover:bg-success-500/10 hover:border-success-500/50 focus:ring-success-500 bg-transparent backdrop-blur-sm',
    ghost: 'text-primary-400 hover:bg-primary-500/10 focus:ring-primary-500 shadow-none hover:shadow-none bg-transparent',
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };

  const buttonClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      
      {icon && iconPosition === 'left' && !loading && (
        <span className="mr-2">{icon}</span>
      )}
      
      {children}
      
      {icon && iconPosition === 'right' && !loading && (
        <span className="ml-2">{icon}</span>
      )}
    </button>
  );
};

export default Button;
