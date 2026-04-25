import React from 'react';
import { cn } from '../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'coral' | 'mint' | 'ink';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-sea text-white hover:bg-sea-l shadow-sh',
      secondary: 'bg-sea-p text-sea hover:bg-sea-ll/20',
      outline: 'border-2 border-sea text-sea hover:bg-sea-p',
      ghost: 'text-sea hover:bg-sea-p',
      coral: 'bg-coral text-white hover:bg-coral-l shadow-sh',
      mint: 'bg-mint text-white hover:bg-mint-l shadow-sh',
      ink: 'bg-ink text-white hover:bg-ink-m shadow-sh',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5',
      lg: 'px-8 py-3.5 text-lg',
      xl: 'px-10 py-4 text-xl font-bold',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-r transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none font-tajawal',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isLoading}
        {...props}
      >
        {isLoading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);
