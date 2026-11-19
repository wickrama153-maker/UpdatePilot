import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants: Record<string, string> = {
    primary:
      'bg-[#009F91] dark:bg-[#19C6B4] text-white dark:text-[#0B141D] hover:bg-[#008A7E] dark:hover:bg-[#63D9D0] shadow-sm font-semibold',
    secondary:
      'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border',
    outline:
      'border border-border bg-card text-foreground hover:bg-secondary/70',
    ghost:
      'bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60',
    danger:
      'bg-[#EF5350]/10 text-[#DC2626] dark:text-[#EF5350] border border-[#EF5350]/30 hover:bg-[#EF5350]/20',
    warning:
      'bg-[#F5B942] text-[#172334] hover:bg-[#F5B942]/90 font-semibold shadow-sm',
  };

  const sizes: Record<string, string> = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-3.5 py-2 gap-2',
    lg: 'text-sm px-4 py-2.5 gap-2',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
