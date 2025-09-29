import { Card } from './Card';
import { StatusIndicator } from './StatusIndicator';
import { LoadingSpinner } from './LoadingSpinner';
import { DashboardData } from '../types/cometbft';

interface ConsensusStateCardProps {
  data: DashboardData;
}

const formatPercentage = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return 'N/A';
  }

  return `${(value * 100).toFixed(1)}%`;
};

export function ConsensusStateCard({ data }: ConsensusStateCardProps) {
  const consensusHealth = data.health.consensus;

  if (data.loading) {
    return (
      <Card title="Consensus State">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <LoadingSpinner />
          <span style={{ color: 'var(--text-secondary)' }}>Loading consensus state...</span>
        </div>
      </Card>
    );
  }

  if (!data.consensusState) {
    return (
      <Card title="Consensus State" glow>
        <StatusIndicator status="error" pulse>
          Consensus data unavailable
        </StatusIndicator>
        <p style={{ marginTop: 'var(--space-3)', color: 'var(--text-error)' }}>
          Unable to load consensus information from the node.
        </p>
      </Card>
    );
  }

  const { round_state } = data.consensusState.result;

  return (
    <Card title="Consensus State" glow={!consensusHealth.healthy}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <StatusIndicator
            status={consensusHealth.healthy ? 'success' : 'warning'}
            pulse={!consensusHealth.healthy}
          >
            {consensusHealth.healthy ? 'Consensus Healthy' : 'Consensus Issues Detected'}
          </StatusIndicator>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 'var(--space-3)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
        }}>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Height</strong>
            <br />
            {consensusHealth.height !== null ? consensusHealth.height.toLocaleString() : 'Unknown'}
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Round</strong>
            <br />
            {consensusHealth.round ?? 'Unknown'}
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Step</strong>
            <br />
            {consensusHealth.step ?? 'Unknown'}
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Prevote Participation</strong>
            <br />
            {formatPercentage(consensusHealth.prevoteRatio)}
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Precommit Participation</strong>
            <br />
            {formatPercentage(consensusHealth.precommitRatio)}
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Round Started</strong>
            <br />
            {new Date(round_state.start_time).toLocaleTimeString()}
          </div>
        </div>

        {consensusHealth.issues.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <h4 style={{
              color: 'var(--text-warning)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              margin: 0,
            }}>
              Consensus Warnings
            </h4>
            {consensusHealth.issues.map((issue, index) => (
              <div
                key={index}
                style={{
                  padding: 'var(--space-3)',
                  background: 'rgba(234, 179, 8, 0.12)',
                  border: '1px solid rgba(234, 179, 8, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-warning)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {issue}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
