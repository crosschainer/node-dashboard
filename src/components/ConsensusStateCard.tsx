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
  const history = data.consensusHistory;

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
  const validators = round_state.validators?.validators?.length ?? null;
  const peerObservers = data.consensusState.result.peers?.length ?? 0;
  const recentHistory = history.slice(-8);

  const average = (values: Array<number | null>) => {
    const valid = values.filter((value): value is number => value !== null && !Number.isNaN(value));
    if (valid.length === 0) {
      return null;
    }
    const sum = valid.reduce((total, value) => total + value, 0);
    return sum / valid.length;
  };

  const averagePrevote = average(recentHistory.map((sample) => sample.prevoteRatio));
  const averagePrecommit = average(recentHistory.map((sample) => sample.precommitRatio));

  const normalizeRatio = (value: number | null) => {
    if (value === null || Number.isNaN(value)) {
      return 0;
    }
    return Math.max(0, Math.min(1, value));
  };

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
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Active Validators</strong>
            <br />
            {validators !== null ? validators.toLocaleString() : 'Unknown'}
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Peer Observations</strong>
            <br />
            {peerObservers.toLocaleString()}
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Avg Prevote (last {recentHistory.length || 1} updates)</strong>
            <br />
            {formatPercentage(averagePrevote)}
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Avg Precommit (last {recentHistory.length || 1} updates)</strong>
            <br />
            {formatPercentage(averagePrecommit)}
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Last Updated</strong>
            <br />
            {data.health.lastUpdated.toLocaleTimeString()}
          </div>
        </div>

        {recentHistory.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <h4 style={{
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              margin: 0,
            }}>
              Participation Trend
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${recentHistory.length}, minmax(0, 1fr))`,
                gap: 'var(--space-3)',
                alignItems: 'flex-end',
              }}
            >
              {recentHistory.map((sample, index) => (
                <div
                  key={`${sample.timestamp}-${index}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      width: '100%',
                      height: '72px',
                      background: 'var(--color-surface-2)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: '50%',
                        height: `${normalizeRatio(sample.prevoteRatio) * 100}%`,
                        background: 'var(--color-primary)',
                        opacity: 0.8,
                      }}
                      title={`Prevote: ${formatPercentage(sample.prevoteRatio)}`}
                    />
                    <div
                      style={{
                        width: '50%',
                        height: `${normalizeRatio(sample.precommitRatio) * 100}%`,
                        background: 'var(--color-accent)',
                        opacity: 0.8,
                      }}
                      title={`Precommit: ${formatPercentage(sample.precommitRatio)}`}
                    />
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    <div>{formatPercentage(sample.prevoteRatio)}</div>
                    <div>{formatPercentage(sample.precommitRatio)}</div>
                    <div>{new Date(sample.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
