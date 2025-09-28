import { Card } from './Card';
import { StatusIndicator } from './StatusIndicator';
import { LoadingSpinner } from './LoadingSpinner';
import { DashboardData } from '../types/cometbft';

interface NetworkInfoCardProps {
  data: DashboardData;
}

export function NetworkInfoCard({ data }: NetworkInfoCardProps) {

  if (data.loading) {
    return (
      <Card title="Network Information">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <LoadingSpinner />
          <span style={{ color: 'var(--text-secondary)' }}>Loading network info...</span>
        </div>
      </Card>
    );
  }

  if (!data.netInfo && !data.status) {
    return (
      <Card title="Network Information">
        <p style={{ color: 'var(--text-error)' }}>Unable to fetch network information</p>
      </Card>
    );
  }

  const peerCount = data.netInfo ? parseInt(data.netInfo.result.n_peers) : 0;
  const isListening = data.netInfo?.result.listening ?? false;

  return (
    <Card title="Network Information">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Connection Status */}
        <div>
          <StatusIndicator 
            status={isListening ? 'success' : 'error'}
            pulse={isListening}
          >
            {isListening ? 'Listening for connections' : 'Not listening'}
          </StatusIndicator>
        </div>

        {/* Peer Information */}
        <div>
          <h4 style={{ 
            color: 'var(--text-accent)', 
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-medium)',
            marginBottom: 'var(--space-2)'
          }}>
            Peer Connections
          </h4>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-3)'
          }}>
            <StatusIndicator 
              status={peerCount > 1 ? 'success' : peerCount > 0 ? 'warning' : 'error'}
            >
              {peerCount} peer{peerCount !== 1 ? 's' : ''} connected
            </StatusIndicator>
          </div>

          {peerCount === 0 && (
            <p style={{ 
              color: 'var(--text-error)', 
              fontSize: 'var(--text-sm)',
              marginBottom: 'var(--space-3)'
            }}>
              No peers connected - node may be isolated
            </p>
          )}

          {peerCount > 0 && peerCount < 2 && (
            <p style={{ 
              color: 'var(--text-warning)', 
              fontSize: 'var(--text-sm)',
              marginBottom: 'var(--space-3)'
            }}>
              Low peer count - consider checking network connectivity
            </p>
          )}
        </div>



        {/* Network Details */}
        {data.status && (
          <div>
            <h4 style={{ 
              color: 'var(--text-accent)', 
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-medium)',
              marginBottom: 'var(--space-2)'
            }}>
              Network Details
            </h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 'var(--space-3)',
              fontSize: 'var(--text-sm)'
            }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Node ID:</strong>
                <br />
                <span style={{ 
                  fontFamily: 'var(--font-mono)', 
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-xs)',
                  wordBreak: 'break-all'
                }}>
                  {data.status.result.node_info.id}
                </span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Listen Address:</strong>
                <br />
                <span style={{ 
                  fontFamily: 'var(--font-mono)', 
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-xs)'
                }}>
                  {data.status.result.node_info.listen_addr}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Listeners */}
        {data.netInfo && data.netInfo.result.listeners.length > 0 && (
          <div>
            <h4 style={{ 
              color: 'var(--text-accent)', 
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-medium)',
              marginBottom: 'var(--space-2)'
            }}>
              Active Listeners
            </h4>
            <div style={{ fontSize: 'var(--text-sm)' }}>
              {data.netInfo.result.listeners.map((listener, index) => (
                <div key={index} style={{ 
                  fontFamily: 'var(--font-mono)', 
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-1)'
                }}>
                  {listener}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}