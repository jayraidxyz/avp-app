import React from 'react';

interface ClayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  active?: boolean;
}

export const ClayCard: React.FC<ClayCardProps> = ({
  interactive = false,
  active = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`clay-card ${interactive ? 'clay-card-interactive' : ''} ${
        active ? 'border-[#E10000]/70 shadow-[0_0_24px_rgba(225,0,0,0.28)]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
