import { useEffect, useState, FormEvent } from 'react';
import { CometBFTLogo, PencilIcon } from './Icons';

interface HeaderProps {
  nodeAddress: string;
  nodeRpcUrl: string;
  isUsingProxy: boolean;
  onNodeAddressChange: (value: string) => void;
}

export function Header({
  nodeAddress,
  nodeRpcUrl,
  isUsingProxy,
  onNodeAddressChange,
}: HeaderProps) {
  const [nodeUrl, setNodeUrl] = useState(nodeAddress);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setNodeUrl(nodeAddress);
    }
  }, [nodeAddress, isEditing]);

  const handleUrlSubmit = (e: FormEvent) => {
    e.preventDefault();
    onNodeAddressChange(nodeUrl.trim());
    setIsEditing(false);
  };

  const handleUrlReset = () => {
    setNodeUrl(nodeAddress);
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
        flexWrap: 'wrap',
        maxWidth: '1400px',
        margin: '0 auto',
        gap: 'var(--space-4)'
      }}>
        {/* Logo and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <CometBFTLogo size={46} />
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
              Dashboard
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
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 'var(--space-3)',
            flexDirection: isEditing ? 'column' : 'row',
          }}
        >
          {isEditing ? (
            <form
              onSubmit={handleUrlSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
            >
              <input
                type="text"
                value={nodeUrl}
                onChange={(e) => setNodeUrl(e.target.value)}
                placeholder="89.163.130.217"
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
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
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
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)'
                }}
              >
                RPC port 26657 is appended automatically
                {isUsingProxy
                  ? ' and HTTP endpoints are proxied to keep the dashboard secure.'
                  : '.'}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                Current endpoint: {nodeRpcUrl}
              </p>
            </form>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                flexDirection: 'row'
              }}
            >
              <span style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-muted)'
              }}>
                Node IP:
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
                  maxWidth: '220px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)'
                }}
                title={nodeRpcUrl}
                aria-label={`Edit node address ${nodeAddress}`}
              >
                <PencilIcon size={14} style={{ flexShrink: 0 }} />
                {nodeAddress || 'Configure node'}
              </button>
             
            </div>
          )}
        </div>
      </div>
    </header>
  );
}