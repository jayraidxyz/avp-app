import React from 'react';

interface CrownIconProps extends React.SVGProps<SVGSVGElement> {
  glow?: boolean;
}

export const CrownIcon: React.FC<CrownIconProps> = ({
  className = 'w-6 h-6',
  glow = false,
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={`stroke-[#E10000] stroke-[2.2] transition-transform duration-150 ${
      glow ? 'drop-shadow-[0_0_12px_rgba(225,0,0,0.65)]' : ''
    } ${className}`}
    {...props}
  >
    <path
      d="M3 19L5 8L10 13L12 5L14 13L19 8L21 19H3Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
