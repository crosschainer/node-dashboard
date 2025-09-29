import { Card } from './Card';
import { StatusIndicator } from './StatusIndicator';
import { LoadingSpinner } from './LoadingSpinner';
import { DashboardData } from '../types/cometbft';

interface MempoolCardProps {
  data: DashboardData;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || value % 1 === 0 ? 0 : 1)} ${units[index]}`;
}

export function MempoolCard({ data }: MempoolCardProps) {
  if (data.loading) {
    return (
      <Card title="Mempool Activity">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <LoadingSpinner />
          <span style={{ color: 'var(--text-secondary)' }}>Fetching mempool data...</span>
        </div>
      </Card>
    );
  }

  if (!data.mempool) {
    return (
      <Card title="Mempool Activity">
        <p style={{ color: 'var(--text-error)' }}>Unable to load mempool information.</p>
      </Card>
    );
  }

  const mempool = data.mempool.result;
  const txCount = parseInt(mempool.n_txs, 10) || 0;
  const total = parseInt(mempool.total, 10) || txCount;
  const totalBytes = parseInt(mempool.total_bytes, 10) || 0;
  const avgSize = txCount > 0 ? Math.round(totalBytes / txCount) : 0;
  const topTxs = mempool.txs.slice(0, 5);

  let loadStatus: 'success' | 'warning' | 'error' = 'success';
  if (txCount > 100) {
    loadStatus = 'error';
  } else if (txCount > 20) {
    loadStatus = 'warning';
  }

  return (
    <Card title="Mempool Activity">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <StatusIndicator status={loadStatus} pulse={txCount > 0}>
              {txCount} pending tx{txCount === 1 ? '' : 's'}
            </StatusIndicator>
            {txCount === 0 && (
              <p style={{ marginTop: 'var(--space-2)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                Mempool is empty.
              </p>
            )}
          </div>
          <div>
            <StatusIndicator status={totalBytes > 0 ? 'success' : 'warning'}>
              {formatBytes(totalBytes)} queued
            </StatusIndicator>
          </div>
          <div>
            <StatusIndicator status={avgSize > 0 ? 'success' : 'warning'}>
              Avg size {avgSize > 0 ? formatBytes(avgSize) : 'n/a'}
            </StatusIndicator>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Total processed:</strong>
            <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{total}</div>
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Last refresh:</strong>
            <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              {data.health.lastUpdated.toLocaleTimeString()}
            </div>
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Source:</strong>
            <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{data.status?.result.node_info.moniker ?? 'Unknown node'}</div>
          </div>
        </div>

        <div>
          <h4 style={{
            color: 'var(--text-accent)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-medium)',
            marginBottom: 'var(--space-2)'
          }}>
            Recent transactions
          </h4>
          {topTxs.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              No transactions queued at the moment.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {topTxs.map((tx, index) => (
                <div
                  key={`${tx}-${index}`}
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-2) var(--space-3)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-secondary)',
                    wordBreak: 'break-all'
                  }}
                >
                  #{index + 1}: {tx.substring(0, 80)}{tx.length > 80 ? '…' : ''}
                </div>
              ))}
            </div>
          )}
          {mempool.txs.length > topTxs.length && (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
              Showing {topTxs.length} of {mempool.txs.length} queued transactions.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
