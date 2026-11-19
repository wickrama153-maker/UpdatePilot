import React from 'react';

interface ProgressBarProps {
  value?: number; // 0-100; omit for indeterminate
  tone?: 'primary' | 'success' | 'warning' | 'error';
  heightClass?: string;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  tone = 'primary',
  heightClass = 'h-2',
  label,
}) => {
  const toneColors: Record<string, string> = {
    primary: 'bg-[#009F91] dark:bg-[#19C6B4]',
    success: 'bg-[#22C55E]',
    warning: 'bg-[#F5B942]',
    error: 'bg-[#EF5350]',
  };

  const isIndeterminate = value === undefined || value === null;
  const clamped = isIndeterminate ? 0 : Math.min(100, Math.max(0, value));

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          {!isIndeterminate && <span className="font-mono font-medium text-foreground">{clamped}%</span>}
        </div>
      )}
      <div className={`w-full ${heightClass} rounded-full bg-secondary overflow-hidden border border-border/50`}>
        {isIndeterminate ? (
          <div className={`h-full ${toneColors[tone]} rounded-full w-2/5 animate-pulse`} />
        ) : (
          <div
            className={`h-full ${toneColors[tone]} rounded-full transition-all duration-300`}
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>
    </div>
  );
};
