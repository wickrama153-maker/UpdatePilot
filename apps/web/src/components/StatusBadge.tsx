import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = (status || 'UNKNOWN').toUpperCase();

  let containerStyle =
    'bg-secondary text-muted-foreground border-border';
  let label = status;
  let dotColor = 'bg-muted-foreground';

  switch (norm) {
    case 'UP_TO_DATE':
      containerStyle =
        'bg-[#22C55E]/10 text-[#15803D] dark:text-[#22C55E] border-[#22C55E]/25';
      label = 'Up to Date';
      dotColor = 'bg-[#22C55E]';
      break;
    case 'UPDATE_AVAILABLE':
      containerStyle =
        'bg-[#F5B942]/15 text-[#B45309] dark:text-[#F5B942] border-[#F5B942]/30';
      label = 'Update Available';
      dotColor = 'bg-[#F5B942]';
      break;
    case 'CRITICAL':
      containerStyle =
        'bg-[#EF5350]/15 text-[#B91C1C] dark:text-[#EF5350] border-[#EF5350]/30';
      label = 'Critical Update';
      dotColor = 'bg-[#EF5350]';
      break;
    case 'IMPORTANT':
      containerStyle =
        'bg-[#F5B942]/15 text-[#B45309] dark:text-[#F5B942] border-[#F5B942]/30';
      label = 'Important Update';
      dotColor = 'bg-[#F5B942]';
      break;
    case 'OPTIONAL':
      containerStyle =
        'bg-[#60A5FA]/15 text-[#1D4ED8] dark:text-[#60A5FA] border-[#60A5FA]/30';
      label = 'Optional Update';
      dotColor = 'bg-[#60A5FA]';
      break;
    case 'UNMATCHED':
      containerStyle =
        'bg-secondary text-muted-foreground border-border';
      label = 'Registry Only';
      dotColor = 'bg-muted-foreground';
      break;
    case 'UNSUPPORTED':
      containerStyle =
        'bg-[#EF5350]/10 text-[#B91C1C] dark:text-[#EF5350] border-[#EF5350]/25';
      label = 'Unsupported';
      dotColor = 'bg-[#EF5350]';
      break;
    case 'ONLINE':
      containerStyle =
        'bg-[#22C55E]/10 text-[#15803D] dark:text-[#22C55E] border-[#22C55E]/25';
      label = 'Online';
      dotColor = 'bg-[#22C55E]';
      break;
    case 'OFFLINE':
    case 'REVOKED':
      containerStyle =
        'bg-[#EF5350]/10 text-[#B91C1C] dark:text-[#EF5350] border-[#EF5350]/25';
      label = norm === 'REVOKED' ? 'Revoked' : 'Offline';
      dotColor = 'bg-[#EF5350]';
      break;
    case 'COMPLETED':
      containerStyle =
        'bg-[#22C55E]/10 text-[#15803D] dark:text-[#22C55E] border-[#22C55E]/25';
      label = 'Completed';
      dotColor = 'bg-[#22C55E]';
      break;
    case 'FAILED':
    case 'TIMED_OUT':
      containerStyle =
        'bg-[#EF5350]/10 text-[#B91C1C] dark:text-[#EF5350] border-[#EF5350]/25';
      label = norm === 'TIMED_OUT' ? 'Timed Out' : 'Failed';
      dotColor = 'bg-[#EF5350]';
      break;
    case 'CANCELLED':
      containerStyle =
        'bg-secondary text-muted-foreground border-border';
      label = 'Cancelled';
      dotColor = 'bg-muted-foreground';
      break;
    case 'REBOOT_REQUIRED':
    case 'REQUIRES_RESTART':
      containerStyle =
        'bg-[#60A5FA]/15 text-[#1D4ED8] dark:text-[#60A5FA] border-[#60A5FA]/30';
      label = 'Requires Restart';
      dotColor = 'bg-[#60A5FA]';
      break;
    case 'DISPATCHED':
      containerStyle =
        'bg-[#60A5FA]/15 text-[#1D4ED8] dark:text-[#60A5FA] border-[#60A5FA]/30';
      label = 'Dispatched';
      dotColor = 'bg-[#60A5FA]';
      break;
    case 'EXECUTING':
    case 'VERIFYING':
    case 'RUNNING':
      containerStyle =
        'bg-[#009F91]/15 dark:bg-[#19C6B4]/15 text-[#008A7E] dark:text-[#63D9D0] border-[#009F91]/30 dark:border-[#19C6B4]/30';
      label = norm === 'VERIFYING' ? 'Verifying' : 'Running';
      dotColor = 'bg-[#009F91] dark:bg-[#19C6B4] animate-ping';
      break;
    case 'APPROVED':
    case 'QUEUED':
    case 'PENDING':
    case 'PREVIEWED':
      containerStyle =
        'bg-[#F5B942]/15 text-[#B45309] dark:text-[#F5B942] border-[#F5B942]/30';
      label = norm === 'APPROVED' || norm === 'QUEUED' ? 'Queued' : 'Pending';
      dotColor = 'bg-[#F5B942]';
      break;
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full whitespace-nowrap select-none ${sizeClasses} ${containerStyle}`}
      role="status"
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
