
import { Card } from './Card';
import { LoadingSpinner } from './LoadingSpinner';
import { DashboardData } from '../types/cometbft';

interface VersionInfoCardProps {
  data: DashboardData;
}

export function VersionInfoCard({ data }: VersionInfoCardProps) {
  if (data.loading) {
    return (
      <Card title="Version Information">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <LoadingSpinner />
          <span style={{ color: 'var(--text-secondary)' }}>Loading version info...</span>
        </div>
      </Card>
    );
  }

  if (!data.status && !data.abciInfo) {
    return (
      <Card title="Version Information">
        <p style={{ color: 'var(--text-error)' }}>Unable to fetch version information</p>
      </Card>
    );
  }

  return (
    <Card title="Version Information">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* CometBFT Version */}
        {data.status && (
          <div>
            <h4 style={{ 
              color: 'var(--text-accent)', 
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-medium)',
              marginBottom: 'var(--space-2)'
            }}>
              CometBFT Version
            </h4>
            <div style={{ 
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-lg)',
              color: 'var(--text-primary)',
              background: 'var(--bg-tertiary)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)'
            }}>
              {data.status.result.node_info.version}
            </div>
          </div>
        )}

        {/* ABCI App Version */}
        {data.abciInfo && (
          <div>
            <h4 style={{ 
              color: 'var(--text-accent)', 
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-medium)',
              marginBottom: 'var(--space-2)'
            }}>
              ABCI App Version
            </h4>
            <div style={{ 
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-lg)',
              color: 'var(--text-primary)',
              background: 'var(--bg-tertiary)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)'
            }}>
              {data.abciInfo.result.response.app_version || 'N/A'}
            </div>
          </div>
        )}

        {/* Protocol Versions */}
        {data.status && (
          <div>
            <h4 style={{ 
              color: 'var(--text-accent)', 
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-medium)',
              marginBottom: 'var(--space-2)'
            }}>
              Protocol Versions
            </h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
              gap: 'var(--space-3)',
              fontSize: 'var(--text-sm)'
            }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>P2P:</strong>
                <br />
                <span style={{ 
                  fontFamily: 'var(--font-mono)', 
                  color: 'var(--text-secondary)' 
                }}>
                  {data.status.result.node_info.protocol_version.p2p}
                </span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Block:</strong>
                <br />
                <span style={{ 
                  fontFamily: 'var(--font-mono)', 
                  color: 'var(--text-secondary)' 
                }}>
                  {data.status.result.node_info.protocol_version.block}
                </span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>App:</strong>
                <br />
                <span style={{ 
                  fontFamily: 'var(--font-mono)', 
                  color: 'var(--text-secondary)' 
                }}>
                  {data.status.result.node_info.protocol_version.app}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}