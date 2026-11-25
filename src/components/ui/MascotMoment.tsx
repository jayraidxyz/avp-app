import React from 'react';
import { ASSETS } from '../../tokens';
import { ActionButton } from './ActionButton';

interface MascotMomentProps {
  title: string;
  subtitle: string;
  mode?: 'empty' | 'loading' | 'error' | 'footer';
  actionLabel?: string;
  onAction?: () => void;
}

export const MascotMoment: React.FC<MascotMomentProps> = ({
  title,
  subtitle,
  mode = 'empty',
  actionLabel,
  onAction,
}) => {
  const isFooter = mode === 'footer';

  return (
    <div
      className={`flex flex-col items-center text-center ${
        isFooter ? 'py-8 px-4' : 'py-12 px-6 clay-card'
      }`}
      role={mode === 'error' ? 'alert' : undefined}
    >
      <div
        className={`relative rounded-full p-1 bg-[#050505] ring-2 ring-[#E10000] shadow-[0_0_24px_rgba(225,0,0,0.45)] ${
          isFooter ? 'w-20 h-20 mb-4' : 'w-24 h-24 mb-5'
        } ${mode === 'loading' ? 'animate-pulse' : ''}`}
      >
        <img
          src={ASSETS.mascotAvatar}
          alt="Toxicology Archive Mascot"
          referrerPolicy="no-referrer"
          className="w-full h-full rounded-full object-cover"
        />
      </div>

      <h3 className="font-heading font-bold text-lg sm:text-xl text-white tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-[#A3A3A3] mt-1.5 max-w-sm leading-relaxed">{subtitle}</p>

      {actionLabel && onAction && (
        <div className="mt-5">
          <ActionButton variant="secondary" size="compact" onClick={onAction}>
            {actionLabel}
          </ActionButton>
        </div>
      )}
    </div>
  );
};
