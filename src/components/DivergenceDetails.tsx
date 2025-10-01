import { useMemo } from 'react';
import { DivergenceHealthDetails } from '../types/cometbft';

interface DivergenceDetailsProps {
  divergence: DivergenceHealthDetails;
}

const MAX_VISIBLE_TRANSACTIONS = 5;

function formatHash(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return value;
}

function formatCause(cause: DivergenceHealthDetails['cause']): string {
  switch (cause) {
    case 'app_hash':
      return 'App hash mismatch';
    case 'last_results':
      return 'Last results hash mismatch';
    default:
      return 'Unknown';
  }
}

export function DivergenceDetails({ divergence }: DivergenceDetailsProps) {
  const { analysis, analysisError } = divergence;

  const missingTransactions = useMemo(() => analysis?.missingTxs ?? [], [analysis?.missingTxs]);
  const unexpectedTransactions = useMemo(() => analysis?.unexpectedTxs ?? [], [analysis?.unexpectedTxs]);

  const renderTransactionList = (label: string, transactions: string[]) => {
    if (!transactions.length) {
      return null;
    }

    const visible = transactions.slice(0, MAX_VISIBLE_TRANSACTIONS);
    const remaining = transactions.length - visible.length;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          background: 'rgba(0, 212, 255, 0.05)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
        }}
      >
        <strong style={{ color: 'var(--text-accent)', fontSize: 'var(--text-sm)' }}>{label}</strong>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {visible.map((tx, index) => (
            <code
              key={`${label}-${index}-${tx.slice(0, 16)}`}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                wordBreak: 'break-all',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: 'var(--space-1) var(--space-2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {tx}
            </code>
          ))}
          {remaining > 0 && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              +{remaining} more transaction{remaining === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>
    );
  };

  const referenceLabel = analysis
    ? `${analysis.referenceNode.address} (${analysis.referenceNode.rpcUrl})`
    : 'Analysing…';

  const analysisTimestamp = analysis?.lastUpdated
    ? new Date(analysis.lastUpdated).toLocaleTimeString()
    : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        background: 'rgba(0, 212, 255, 0.06)',
      }}
    >
      <div>
        <h4
          style={{
            color: 'var(--text-accent)',
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-medium)',
            marginBottom: 'var(--space-2)',
          }}
        >
          App Hash Divergence Analysis
        </h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          {analysis
            ? 'The dashboard compared the affected block against a healthy reference node to highlight transaction differences.'
            : 'Gathering block data from the reference node to explain the divergence…'}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-3)',
          fontSize: 'var(--text-sm)',
        }}
      >
        <div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>Block height</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>
            {divergence.height ?? analysis?.blockHeight ?? 'Unknown'}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>Detected issue</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>
            {formatCause(divergence.cause)}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>Node app hash</div>
          <code style={{ fontSize: 'var(--text-xs)', wordBreak: 'break-all' }}>
            {formatHash(divergence.nodeAppHash ?? analysis?.nodeAppHash)}
          </code>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>ABCI app hash</div>
          <code style={{ fontSize: 'var(--text-xs)', wordBreak: 'break-all' }}>
            {formatHash(divergence.abciAppHash)}
          </code>
        </div>
        {analysis?.referenceAppHash && (
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>Reference app hash</div>
            <code style={{ fontSize: 'var(--text-xs)', wordBreak: 'break-all' }}>
              {formatHash(analysis.referenceAppHash)}
            </code>
          </div>
        )}
        <div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>Last results hash</div>
          <code style={{ fontSize: 'var(--text-xs)', wordBreak: 'break-all' }}>
            {formatHash(divergence.nodeLastResultsHash)}
          </code>
        </div>
        <div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>Reference node</div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>{referenceLabel}</div>
        </div>
        {analysis && (
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>Transaction counts</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>
              {analysis.nodeTxCount} on node · {analysis.referenceTxCount} on reference
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
              {analysis.matchingTxCount} matching · {missingTransactions.length} missing · {unexpectedTransactions.length} unexpected
            </div>
          </div>
        )}
        {analysisTimestamp && (
          <div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>Last analysed</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>{analysisTimestamp}</div>
          </div>
        )}
      </div>

      {analysisError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            color: 'var(--text-error)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {analysisError}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {renderTransactionList('Missing transactions', missingTransactions)}
        {renderTransactionList('Unexpected transactions', unexpectedTransactions)}
      </div>
    </div>
  );
}
