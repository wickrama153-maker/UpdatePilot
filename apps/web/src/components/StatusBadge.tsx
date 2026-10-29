import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = (status || 'UNKNOWN').toUpperCase();

  // Swiss Engineering Interface Semantic Tokens:
  // Green: #34785A | Orange: #F06435 | Amber: #C88B24 | Red: #B8433D | Muted: #77786F
  let containerStyle = 'bg-stone-500/10 text-[#77786F] dark:text-[#9E9F97] border-[#D8D2C6] dark:border-[#383A35]';
  let label = status;
  let dotColor = 'bg-[#77786F]';
  let prefix = '●';

  switch (norm) {
    case 'UP_TO_DATE':
      containerStyle = 'bg-[#34785A]/10 text-[#34785A] dark:text-[#4AA880] border-[#34785A]/30';
      label = 'UP TO DATE';
      dotColor = 'bg-[#34785A] dark:bg-[#4AA880]';
      prefix = '●';
      break;
    case 'UPDATE_AVAILABLE':
      containerStyle = 'bg-[#F06435]/10 text-[#F06435] dark:text-[#F37B52] border-[#F06435]/35';
      label = 'UPDATE READY';
      dotColor = 'bg-[#F06435]';
      prefix = '▲';
      break;
    case 'UNMATCHED':
      containerStyle = 'bg-[#77786F]/10 text-[#77786F] dark:text-[#A2A49B] border-[#77786F]/30';
      label = 'REGISTRY';
      dotColor = 'bg-[#77786F]';
      prefix = '◈';
      break;
    case 'UNSUPPORTED':
      containerStyle = 'bg-[#B8433D]/10 text-[#B8433D] dark:text-[#D95F59] border-[#B8433D]/30';
      label = 'UNSUPPORTED';
      dotColor = 'bg-[#B8433D]';
      prefix = '✕';
      break;
    case 'ONLINE':
      containerStyle = 'bg-[#34785A]/10 text-[#34785A] dark:text-[#4AA880] border-[#34785A]/30';
      label = 'ONLINE';
      dotColor = 'bg-[#34785A] dark:bg-[#4AA880]';
      prefix = '●';
      break;
    case 'OFFLINE':
      containerStyle = 'bg-[#B8433D]/10 text-[#B8433D] dark:text-[#D95F59] border-[#B8433D]/30';
      label = 'OFFLINE';
      dotColor = 'bg-[#B8433D]';
      prefix = '◼';
      break;
    case 'COMPLETED':
      containerStyle = 'bg-[#34785A]/10 text-[#34785A] dark:text-[#4AA880] border-[#34785A]/30';
      label = 'VERIFIED';
      dotColor = 'bg-[#34785A] dark:bg-[#4AA880]';
      prefix = '✓';
      break;
    case 'FAILED':
      containerStyle = 'bg-[#B8433D]/10 text-[#B8433D] dark:text-[#D95F59] border-[#B8433D]/30';
      label = 'FAILED';
      dotColor = 'bg-[#B8433D]';
      prefix = '✕';
      break;
    case 'REBOOT_REQUIRED':
      containerStyle = 'bg-[#2A7488]/15 text-[#2A7488] dark:text-[#4FB2CC] border-[#2A7488]/30';
      label = 'REBOOT REQ';
      dotColor = 'bg-[#2A7488] dark:bg-[#4FB2CC]';
      prefix = '⟳';
      break;
    case 'EXECUTING':
    case 'RUNNING':
      containerStyle = 'bg-[#F06435]/15 text-[#F06435] border-[#F06435]/40';
      label = 'EXECUTING';
      dotColor = 'bg-[#F06435] animate-ping';
      prefix = '⚡';
      break;
    case 'APPROVED':
    case 'PENDING':
      containerStyle = 'bg-[#C88B24]/10 text-[#C88B24] dark:text-[#E0A238] border-[#C88B24]/30';
      label = 'PENDING';
      dotColor = 'bg-[#C88B24] dark:bg-[#E0A238]';
      prefix = '◷';
      break;
  }

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px] tracking-wider'
    : 'px-2.5 py-1 text-[11px] tracking-wider';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-bold uppercase border rounded ${sizeClasses} ${containerStyle} select-none`}
      role="status"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
