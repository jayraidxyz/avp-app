import React from 'react';

export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'compact';
}

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ className = '', variant = 'primary', size = 'default', type = 'button', children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 font-heading font-bold tracking-tight whitespace-nowrap shrink-0 rounded-full transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] select-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    const sizing =
      size === 'default'
        ? 'min-h-[48px] px-6 text-sm sm:text-base'
        : 'min-h-[44px] px-4 text-xs sm:text-sm';

    const variants = {
      primary:
        'bg-[#E10000] text-white hover:bg-[#FF2A1F] shadow-[0_0_24px_rgba(225,0,0,0.4)] hover:shadow-[0_0_28px_rgba(255,42,31,0.55)]',
      secondary:
        'bg-transparent border-[1.5px] border-white text-white hover:bg-white/10',
      ghost:
        'bg-[#161616] border-[1.5px] border-[#2A2A2A] text-white hover:border-[#E10000]/60 hover:bg-[#1E1E1E]',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={`${base} ${sizing} ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
ActionButton.displayName = 'ActionButton';
