import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = (status || 'UNKNOWN').toUpperCase();

  let styles = 'bg-slate-800 text-slate-300 border-slate-700';
  let label = status;
  let dotColor = 'bg-slate-400';

  switch (norm) {
    case 'UP_TO_DATE':
      styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      label = 'Up to Date';
      dotColor = 'bg-emerald-400';
      break;
    case 'UPDATE_AVAILABLE':
      styles = 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse';
      label = 'Update Available';
      dotColor = 'bg-amber-400';
      break;
    case 'UNMATCHED':
      styles = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      label = 'Unmatched';
      dotColor = 'bg-purple-400';
      break;
    case 'UNSUPPORTED':
      styles = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      label = 'Unsupported';
      dotColor = 'bg-rose-400';
      break;
    case 'ONLINE':
      styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      label = 'Online';
      dotColor = 'bg-emerald-400';
      break;
    case 'OFFLINE':
      styles = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      label = 'Offline';
      dotColor = 'bg-rose-400';
      break;
    case 'COMPLETED':
      styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      label = 'Completed';
      dotColor = 'bg-emerald-400';
      break;
    case 'FAILED':
      styles = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      label = 'Failed';
      dotColor = 'bg-rose-400';
      break;
    case 'REBOOT_REQUIRED':
      styles = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      label = 'Reboot Required';
      dotColor = 'bg-sky-400';
      break;
    case 'EXECUTING':
    case 'RUNNING':
      styles = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      label = 'Running';
      dotColor = 'bg-blue-400 animate-ping';
      break;
    case 'APPROVED':
    case 'PENDING':
      styles = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      label = 'Pending';
      dotColor = 'bg-amber-400';
      break;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${sizeClasses} ${styles}`}
      role="status"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
      {label}
    </span>
  );
};
