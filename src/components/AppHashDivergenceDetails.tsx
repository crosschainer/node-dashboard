import { Fragment } from 'react';
import { AppHashDivergenceDiagnostics, TransactionMismatch } from '../types/cometbft';

interface AppHashDivergenceDetailsProps {
  diagnostics: AppHashDivergenceDiagnostics;
}

function formatHash(value: string | null): string {
  if (!value) {
    return '—';
  }

  const trimmed = value.trim();
  if (trimmed.length <= 24) {
    return trimmed;
  }

  return `${trimmed.slice(0, 16)}…${trimmed.slice(-8)}`;
}

function formatTransactionPreview(value: string | null): string {
  if (!value) {
    return '—';
  }

  const trimmed = value.replace(/\s+/g, '');
  if (trimmed.length <= 32) {
    return trimmed;
  }

  return `${trimmed.slice(0, 20)}…${trimmed.slice(-6)}`;
}

function TransactionList({
  title,
  transactions,
  emptyMessage,
  tone,
}: {
  title: string;
  transactions: string[];
  emptyMessage: string;
  tone: 'warning' | 'danger' | 'muted';
}) {
  const colorMap: Record<'warning' | 'danger' | 'muted', string> = {
    warning: 'var(--color-warning)',
    danger: 'var(--color-error)',
    muted: 'var(--text-muted)',
  } as const;

  const limited = transactions.slice(0, 10);
  const hasMore = transactions.length > limited.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <h5 style={{
        margin: 0,
        fontSize: 'var(--text-sm)',
        color: colorMap[tone],
        fontWeight: 'var(--font-medium)',
      }}>
        {title}
      </h5>
      {limited.length === 0 ? (
        <p style={{
          margin: 0,
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
        }}>
          {emptyMessage}
        </p>
      ) : (
        <ul style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}>
          {limited.map((tx, index) => (
            <li
              key={`${title}-${index}-${tx}`}
              style={{
                padding: 'var(--space-2)',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${colorMap[tone]}22`,
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                wordBreak: 'break-all',
              }}
            >
              {formatTransactionPreview(tx)}
            </li>
          ))}
          {hasMore && (
            <li style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
            }}>
              …and {transactions.length - limited.length} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function MismatchList({ mismatches }: { mismatches: TransactionMismatch[] }) {
  if (mismatches.length === 0) {
    return null;
  }

  const limited = mismatches.slice(0, 10);
  const hasMore = mismatches.length > limited.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <h5 style={{
        margin: 0,
        fontSize: 'var(--text-sm)',
        color: 'var(--color-error)',
        fontWeight: 'var(--font-medium)',
      }}>
        Order mismatches
      </h5>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 0.5fr) minmax(0, 0.5fr)',
        gap: 'var(--space-2)',
        fontSize: 'var(--text-xs)',
      }}>
        <div style={{ color: 'var(--text-muted)', fontWeight: 'var(--font-medium)' }}>Index</div>
        <div style={{ color: 'var(--text-muted)', fontWeight: 'var(--font-medium)' }}>Details</div>
        {limited.map((mismatch) => {
          const key = `${mismatch.index}-${mismatch.suspectTx ?? 'null'}-${mismatch.referenceTx ?? 'null'}`;
          return (
            <Fragment key={key}>
              <div style={{ color: 'var(--text-secondary)' }}>
                #{mismatch.index}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-1)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span>Target: {formatTransactionPreview(mismatch.suspectTx)}</span>
                <span>Reference: {formatTransactionPreview(mismatch.referenceTx)}</span>
              </div>
            </Fragment>
          );
        })}
        {hasMore && (
          <div style={{ gridColumn: '1 / span 2', color: 'var(--text-muted)' }}>
            …and {mismatches.length - limited.length} more differences
          </div>
        )}
      </div>
    </div>
  );
}

export function AppHashDivergenceDetails({ diagnostics }: AppHashDivergenceDetailsProps) {
  const {
    height,
    suspectNode,
    referenceNode,
    suspectAppHash,
    referenceAppHash,
    suspectBlockHash,
    referenceBlockHash,
    suspectTxCount,
    referenceTxCount,
    missingTransactions,
    extraTransactions,
    orderMismatches,
    error,
    lastChecked,
  } = diagnostics;

  const hasDifferences = missingTransactions.length > 0
    || extraTransactions.length > 0
    || orderMismatches.length > 0;

  return (
    <div
      style={{
        marginTop: 'var(--space-4)',
        paddingTop: 'var(--space-4)',
        borderTop: '1px solid var(--border-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <h4 style={{
          margin: 0,
          fontSize: 'var(--text-base)',
          color: 'var(--text-error)',
          fontWeight: 'var(--font-semibold)',
        }}>
          App hash divergence diagnostics
        </h4>
        <p style={{
          margin: 0,
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
        }}>
          Comparing block {height != null ? `#${height}` : 'at unknown height'} between {suspectNode} and reference node {referenceNode}.
        </p>
        <p style={{
          margin: 0,
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
        }}>
          Last checked: {lastChecked.toLocaleString()}
        </p>
      </div>

      {error && (
        <div style={{
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          background: 'rgba(239, 68, 68, 0.08)',
          color: 'var(--text-error)',
          fontSize: 'var(--text-sm)',
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-3)',
        fontSize: 'var(--text-sm)',
      }}>
        <div style={{
          padding: 'var(--space-3)',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Target node</span>
          <span style={{ color: 'var(--text-secondary)' }}>{suspectNode}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>App hash</span>
          <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{formatHash(suspectAppHash)}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Block hash</span>
          <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{formatHash(suspectBlockHash)}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Transactions</span>
          <span style={{ color: 'var(--text-secondary)' }}>{suspectTxCount}</span>
        </div>

        <div style={{
          padding: 'var(--space-3)',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Reference node</span>
          <span style={{ color: 'var(--text-secondary)' }}>{referenceNode}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>App hash</span>
          <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{formatHash(referenceAppHash)}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Block hash</span>
          <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{formatHash(referenceBlockHash)}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Transactions</span>
          <span style={{ color: 'var(--text-secondary)' }}>{referenceTxCount}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <TransactionList
          title="Missing from target"
          transactions={missingTransactions}
          emptyMessage="No missing transactions detected compared to reference node."
          tone="warning"
        />
        <TransactionList
          title="Unexpected on target"
          transactions={extraTransactions}
          emptyMessage="No additional transactions found on target node."
          tone="danger"
        />
        <MismatchList mismatches={orderMismatches} />
      </div>

      {!hasDifferences && !error && (
        <p style={{
          margin: 0,
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
        }}>
          No transaction differences were detected. Review the ABCI logs on the target node for additional context.
        </p>
      )}
    </div>
  );
}
