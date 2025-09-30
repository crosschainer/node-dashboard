import { useEffect, useState, FormEvent } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { CometBFTLogo, PencilIcon, WalletIcon, XIcon } from './Icons';
import { ConnectedWalletInfo } from '../hooks/useWallet';

interface HeaderProps {
  nodeAddress: string;
  nodeRpcUrl: string;
  isUsingProxy: boolean;
  onNodeAddressChange: (value: string) => void;
  walletInfo: ConnectedWalletInfo | null;
  isConnectingWallet: boolean;
  onConnectWallet: () => void;
  walletError: string | null;
  onClearWalletError: () => void;
}

export function Header({
  nodeAddress,
  nodeRpcUrl,
  isUsingProxy,
  onNodeAddressChange,
  walletInfo,
  isConnectingWallet,
  onConnectWallet,
  walletError,
  onClearWalletError,
}: HeaderProps) {
  const [nodeUrl, setNodeUrl] = useState(nodeAddress);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setNodeUrl(nodeAddress);
    }
  }, [nodeAddress, isEditing]);

  const walletDisplayAddress = walletInfo?.truncatedAddress
    ?? (walletInfo?.address
      ? `${walletInfo.address.slice(0, 6)}…${walletInfo.address.slice(-4)}`
      : null);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {isEditing ? (
            <form onSubmit={handleUrlSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
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
              <p style={{
                margin: 0,
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)'
              }}>
                RPC port 26657 is appended automatically{isUsingProxy ? ' and HTTP endpoints are proxied to keep the dashboard secure.' : '.'}
              </p>
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

        {/* Wallet Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Wallet status
              </span>
              <span style={{ fontSize: 'var(--text-sm)', color: walletInfo ? 'var(--text-secondary)' : 'var(--text-muted)', fontFamily: walletInfo ? 'var(--font-mono)' : 'inherit' }}>
                {walletInfo ? walletDisplayAddress : 'Not connected'}
              </span>
              {walletInfo?.locked ? (
                <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>
                  Wallet is locked
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onConnectWallet}
              disabled={isConnectingWallet}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--primary-gradient)',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                color: 'white',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)',
                cursor: isConnectingWallet ? 'not-allowed' : 'pointer',
                transition: 'var(--transition-fast)',
                opacity: isConnectingWallet ? 0.7 : 1,
              }}
            >
              {isConnectingWallet ? (
                <>
                  <LoadingSpinner size="sm" />
                  Connecting…
                </>
              ) : (
                <>
                  <WalletIcon size={16} />
                  {walletInfo ? 'Reconnect Wallet' : 'Connect Wallet'}
                </>
              )}
            </button>
          </div>
          {walletError ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              background: 'rgba(255, 71, 87, 0.12)',
              color: 'var(--color-error)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-2) var(--space-3)',
              fontSize: 'var(--text-xs)',
            }}>
              <span>{walletError}</span>
              <button
                type="button"
                onClick={onClearWalletError}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
                aria-label="Dismiss wallet error"
              >
                <XIcon size={12} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}