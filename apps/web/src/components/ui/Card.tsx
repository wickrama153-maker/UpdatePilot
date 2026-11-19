import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  hoverable = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`rounded-xl border border-border bg-card text-card-foreground shadow-enterprise-sm dark:shadow-none transition-all duration-150 ${
        hoverable ? 'hover:border-[#009F91]/50 dark:hover:border-[#19C6B4]/50 hover:shadow-enterprise-md' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`px-5 py-4 border-b border-border flex items-center justify-between gap-3 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h3 className={`text-sm font-semibold tracking-tight text-foreground ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p className={`text-xs text-muted-foreground mt-0.5 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`px-5 py-3.5 border-t border-border bg-secondary/30 rounded-b-xl flex items-center justify-between gap-3 ${className}`} {...props}>
    {children}
  </div>
);
