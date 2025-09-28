
import { ReactNode } from 'react';
import { CheckIcon, XIcon, AlertTriangleIcon } from './Icons';

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
  
  const getIcon = () => {
    switch (status) {
      case 'success':
        return <CheckIcon size={14} />;
      case 'error':
        return <XIcon size={14} />;
      case 'warning':
        return <AlertTriangleIcon size={14} />;
      default:
        return null;
    }
  };
  
  return (
    <div className={`${baseClasses} ${statusClasses[status]} ${pulseClass}`}>
      {getIcon()}
      {children}
    </div>
  );
}