import { Card } from './Card';
import { StatusIndicator } from './StatusIndicator';
import { DashboardData } from '../types/cometbft';

interface HealthAlertsCardProps {
  data: DashboardData;
}


export function HealthAlertsCard({ data }: HealthAlertsCardProps) {
  const { health } = data;

  const issues = [...health.errorMessages];
  const hasIssues = health.hasErrors || issues.length > 0;

  return (
    <Card 
      title="Health & Alerts" 
      glow={hasIssues}
      className={hasIssues ? 'border-error' : ''}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Overall Health Status */}
        <div>
          <StatusIndicator 
            status={!hasIssues ? 'success' : 'error'}
            pulse={hasIssues}
          >
            {!hasIssues ? 'All Systems Healthy' : 'Issues Detected'}
          </StatusIndicator>
        </div>

        {/* Error Messages */}
        {issues.length > 0 && (
          <div>
            <h4 style={{
              color: 'var(--text-error)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-medium)',
              marginBottom: 'var(--space-2)'
            }}>
              Active Issues
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {issues.map((message, index) => (
                <div
                  key={index}
                  style={{
                    padding: 'var(--space-3)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-error)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--color-error)',
                      marginTop: '6px',
                      flexShrink: 0
                    }} />
                    <span>{message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

          {/* Health Summary */}
          <div>
            <h4 style={{
              color: 'var(--text-accent)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-medium)',
              marginBottom: 'var(--space-2)'
            }}>
              System Status
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-3)',
              fontSize: 'var(--text-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: health.isOnline ? 'var(--color-success)' : 'var(--color-error)'
                }} />
                <span style={{ color: 'var(--text-secondary)' }}>
                  Node: {health.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: health.isSynced ? 'var(--color-success)' : 'var(--color-warning)'
                }} />
                <span style={{ color: 'var(--text-secondary)' }}>
                  Sync: {health.isSynced ? 'Current' : 'Behind'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: health.consensus.healthy ? 'var(--color-success)' : 'var(--color-warning)'
                }} />
                <span style={{ color: 'var(--text-secondary)' }}>
                  Consensus: {health.consensus.healthy ? 'Healthy' : 'At Risk'}
                </span>
              </div>
            </div>
          </div>

        {/* Last Updated */}
        <div style={{ 
          borderTop: '1px solid var(--border-primary)',
          paddingTop: 'var(--space-3)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)'
        }}>
          Last checked: {health.lastUpdated.toLocaleTimeString()}
        </div>
      </div>
    </Card>
  );
}
