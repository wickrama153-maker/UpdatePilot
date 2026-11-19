import React from 'react';

interface TooltipProps {
  label: string;
  enabled?: boolean;
  position?: 'right' | 'top' | 'bottom';
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({
  label,
  enabled = true,
  position = 'right',
  children,
}) => {
  if (!enabled) return <>{children}</>;

  const posClasses: Record<string, string> = {
    right: 'left-full ml-2.5 top-1/2 -translate-y-1/2',
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
  };

  return (
    <div className="relative group/tooltip inline-flex w-full">
      {children}
      <div
        role="tooltip"
        className={`pointer-events-none opacity-0 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 transition-opacity duration-150 absolute ${posClasses[position]} z-50 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap bg-[#101827] dark:bg-[#202E40] text-[#F1F5F9] border border-[#2D3B4D] shadow-lg`}
      >
        {label}
      </div>
    </div>
  );
};
