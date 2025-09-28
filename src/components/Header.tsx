import { useState, FormEvent } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { cometbftService } from '../services/cometbft';

interface HeaderProps {
  isLoading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onNodeUrlChange: (url: string) => void;
}

export function Header({ isLoading, lastUpdated, onRefresh, onNodeUrlChange }: HeaderProps) {
  const [nodeUrl, setNodeUrl] = useState(cometbftService.getBaseUrl());
  const [isEditing, setIsEditing] = useState(false);

  const handleUrlSubmit = (e: FormEvent) => {
    e.preventDefault();
    onNodeUrlChange(nodeUrl);
    setIsEditing(false);
  };

  const handleUrlReset = () => {
    setNodeUrl(cometbftService.getBaseUrl());
    setIsEditing(false);
  };

  return (
    <header style={{
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-primary)',
      padding: 'var(--space-4) var(--space-6)',
      position: 'sticky',
      top: 0,
      zIndex: 'var(--z-sticky)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1400px',
        margin: '0 auto',
        gap: 'var(--space-4)'
      }}>
        {/* Logo and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'var(--primary-gradient)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-bold)',
            color: 'white'
          }}>
            ⚡
          </div>
          <div>
            <h1 style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 'var(--font-bold)',
              margin: 0,
              background: 'var(--primary-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              CometBFT Dashboard
            </h1>
            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-muted)',
              margin: 0
            }}>
              Node Health Monitoring
            </p>
          </div>
        </div>

        {/* Node URL Configuration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {isEditing ? (
            <form onSubmit={handleUrlSubmit} style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                type="url"
                value={nodeUrl}
                onChange={(e) => setNodeUrl(e.target.value)}
                placeholder="https://node.example.com"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-mono)',
                  minWidth: '250px'
                }}
                autoFocus
              />
              <button
                type="submit"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--primary-gradient)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: 'white',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-medium)',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleUrlReset}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'transparent',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ 
                fontSize: 'var(--text-sm)', 
                color: 'var(--text-muted)' 
              }}>
                Node:
              </span>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  color: 'var(--text-accent)',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={nodeUrl}
              >
                {nodeUrl}
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* Last Updated */}
          {lastUpdated && (
            <div style={{ 
              fontSize: 'var(--text-xs)', 
              color: 'var(--text-muted)',
              textAlign: 'right'
            }}>
              <div>Last updated:</div>
              <div>{lastUpdated.toLocaleTimeString()}</div>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
              background: isLoading ? 'var(--bg-tertiary)' : 'var(--primary-gradient)',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              color: 'white',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'var(--transition-fast)',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                Refreshing...
              </>
            ) : (
              <>
                <span style={{ fontSize: 'var(--text-base)' }}>🔄</span>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}