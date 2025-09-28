
import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ title, children, className = '', glow = false }: CardProps) {
  const glowClass = glow ? 'glow' : '';
  
  return (
    <div className={`card fade-in ${glowClass} ${className}`}>
      {title && (
        <h3 style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 'var(--font-semibold)',
          marginBottom: 'var(--space-4)',
          color: 'var(--text-primary)'
        }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}