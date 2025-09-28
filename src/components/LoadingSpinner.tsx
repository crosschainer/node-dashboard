

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div 
        className="animate-spin rounded-full border-2 border-transparent"
        style={{
          borderTopColor: 'var(--color-accent)',
          borderRightColor: 'var(--color-accent)',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}