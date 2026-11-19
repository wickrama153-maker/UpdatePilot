import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="py-12 px-6 text-center rounded-xl border border-dashed border-border bg-card/60 flex flex-col items-center justify-center">
      <div className="w-11 h-11 rounded-xl bg-secondary border border-border text-[#009F91] dark:text-[#19C6B4] flex items-center justify-center mb-3.5">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1 max-w-md leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
