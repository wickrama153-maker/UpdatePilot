import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-secondary/80 ${className}`} />
);

export const TableRowSkeleton: React.FC<{ cols?: number; rows?: number }> = ({
  cols = 6,
  rows = 6,
}) => (
  <>
    {Array.from({ length: rows }).map((_, rIdx) => (
      <tr key={rIdx} className="border-b border-border/60">
        {Array.from({ length: cols }).map((__, cIdx) => (
          <td key={cIdx} className="py-3.5 px-4">
            <Skeleton className={`h-4 ${cIdx === 0 ? 'w-36' : cIdx === cols - 1 ? 'w-16 ml-auto' : 'w-20'}`} />
          </td>
        ))}
      </tr>
    ))}
  </>
);
