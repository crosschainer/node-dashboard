

import { ReactNode } from 'react';

interface StatusIndicatorProps {
  status: 'success' | 'error' | 'warning';
  children: ReactNode;
  pulse?: boolean;
}

export function StatusIndicator({ status, children, pulse = false }: StatusIndicatorProps) {
  const baseClasses = 'status-indicator';
  const statusClasses = {
    success: 'status-success',
    error: 'status-error',
    warning: 'status-warning',
  };
  
  const pulseClass = pulse ? 'pulse' : '';
  
  return (
    <div className={`${baseClasses} ${statusClasses[status]} ${pulseClass}`}>
      <div className={`w-2 h-2 rounded-full bg-current ${pulse ? 'pulse' : ''}`} />
      {children}
    </div>
  );
}