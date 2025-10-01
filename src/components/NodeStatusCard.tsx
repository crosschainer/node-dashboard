
import { Card } from './Card';
import { StatusIndicator } from './StatusIndicator';
import { LoadingSpinner } from './LoadingSpinner';
import { DashboardData } from '../types/cometbft';

interface NodeStatusCardProps {
  data: DashboardData;
}

export function NodeStatusCard({ data }: NodeStatusCardProps) {
  if (data.loading) {
    return (
      <Card title="Node Status">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <LoadingSpinner />
          <span style={{ color: 'var(--text-secondary)' }}>Loading node status...</span>
        </div>
      </Card>
    );
  }

  if (data.error || !data.status) {
    return (
      <Card title="Node Status">
        <StatusIndicator status="error">
          Node Offline
        </StatusIndicator>
        {data.error && (
          <p style={{
            marginTop: 'var(--space-3)',
            color: 'var(--text-error)',
            fontSize: 'var(--text-sm)'
          }}>
            {data.error}
          </p>
        )}
      </Card>
    );
  }

  const { sync_info, node_info, validator_info } = data.status.result;
  const isSynced = !sync_info.catching_up;
  const votingPower = Number(validator_info.voting_power);
  const isValidator = Number.isFinite(votingPower) && votingPower > 0;

  return (
    <Card title="Node Status" glow={data.health.isOnline}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          {/* Online Status */}
          <div>
            <StatusIndicator status={data.health.isOnline ? 'success' : 'error'}>
              {data.health.isOnline ? 'Online' : 'Offline'}
            </StatusIndicator>
          </div>

          {/* Sync Status */}
          <div>
            <StatusIndicator status={isSynced ? 'success' : 'warning'} pulse={!isSynced}>
              {isSynced ? 'Synced' : 'Syncing'}
            </StatusIndicator>
            

          </div>

          {/* Validator Status */}
          <div>
            <StatusIndicator status={isValidator ? 'success' : 'warning'}>
              {isValidator ? 'Validator Active' : 'Not in Validator Set'}
            </StatusIndicator>
            
          </div>
        </div>

        {/* Node Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-3)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)'
        }}>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Network:</strong>
            <br />
            {node_info.network}
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Moniker:</strong>
            <br />
            {node_info.moniker}
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Block Height:</strong>
            <br />
            {parseInt(sync_info.latest_block_height).toLocaleString()}
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Last Updated:</strong>
            <br />
            {new Date(sync_info.latest_block_time).toLocaleTimeString()}
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Validator Address:</strong>
            <br />
            {validator_info.address}
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Voting Power:</strong>
            <br />
            {Number.isFinite(votingPower) ? votingPower.toLocaleString() : '0'}
          </div>
        </div>
      </div>
    </Card>
  );
}