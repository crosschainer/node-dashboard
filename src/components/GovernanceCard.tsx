import { GovernanceHookResult } from '../hooks/useGovernance';
import { Card } from './Card';
import { LoadingSpinner } from './LoadingSpinner';
import { RefreshIcon } from './Icons';

interface GovernanceCardProps {
  isValidator: boolean;
  governance: GovernanceHookResult;
}

export function GovernanceCard({ isValidator, governance }: GovernanceCardProps) {
  if (!isValidator) {
    return (
      <Card title="Governance Votes">
        <p style={{
          margin: 0,
          color: 'var(--text-muted)',
          fontSize: 'var(--text-sm)',
          lineHeight: 1.6,
        }}>
          This node is not currently participating as a validator. Governance data is
          only available for validator nodes.
        </p>
      </Card>
    );
  }

  const {
    totalProposals,
    proposals,
    page,
    pageSize,
    totalPages,
    isLoading,
    error,
    goToPage,
    refresh,
  } = governance;

  const handlePrevious = () => {
    if (page > 1) {
      goToPage(page - 1);
    }
  };

  const handleNext = () => {
    if (totalPages > 0 && page < totalPages) {
      goToPage(page + 1);
    }
  };

  const showingFrom = totalProposals && totalProposals > 0
    ? (page - 1) * pageSize + 1
    : 0;
  const showingTo = totalProposals && totalProposals > 0
    ? (proposals.length > 0
      ? Math.min(totalProposals, showingFrom + proposals.length - 1)
      : showingFrom)
    : 0;

  return (
    <Card title="Governance Votes">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
        flexWrap: 'wrap',
      }}>
        <div>
          <p style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            color: 'var(--text-muted)',
          }}>
            Total proposals: {totalProposals ?? '—'}
          </p>
          {totalProposals && totalProposals > 0 && (
            <p style={{
              margin: 0,
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              marginTop: 'var(--space-1)',
            }}>
              Showing {showingFrom} – {showingTo} of {totalProposals}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            background: isLoading ? 'var(--bg-tertiary)' : 'var(--primary-gradient)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: 'white',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)',
            cursor: isLoading ? 'default' : 'pointer',
            transition: 'var(--transition-fast)',
          }}
        >
          <RefreshIcon size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 'var(--space-3)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 59, 48, 0.1)',
            color: 'var(--color-error)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {error}
        </div>
      )}

      {isLoading && proposals.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6) 0' }}>
          <LoadingSpinner size="md" />
        </div>
      ) : null}

      {!isLoading && (totalProposals ?? 0) === 0 && !error ? (
        <p style={{
          margin: 0,
          color: 'var(--text-muted)',
          fontSize: 'var(--text-sm)',
        }}>
          No governance proposals found.
        </p>
      ) : null}

      {proposals.length > 0 && (
        <div style={{
          overflowX: 'auto',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-primary)',
          marginBottom: 'var(--space-4)',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 'var(--text-sm)',
          }}>
            <thead>
              <tr style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                textAlign: 'left',
              }}>
                <th style={{ padding: 'var(--space-3)' }}>ID</th>
                <th style={{ padding: 'var(--space-3)' }}>Type</th>
                <th style={{ padding: 'var(--space-3)' }}>Argument</th>
                <th style={{ padding: 'var(--space-3)' }}>Yes</th>
                <th style={{ padding: 'var(--space-3)' }}>No</th>
                <th style={{ padding: 'var(--space-3)' }}>Finalized</th>
                <th style={{ padding: 'var(--space-3)' }}>Voters</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr
                  key={proposal.id}
                  style={{
                    borderTop: '1px solid var(--border-primary)',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <td style={{ padding: 'var(--space-3)', fontFamily: 'var(--font-mono)' }}>{proposal.id}</td>
                  <td style={{ padding: 'var(--space-3)', textTransform: 'capitalize' }}>{proposal.type.replace(/_/g, ' ')}</td>
                  <td style={{ padding: 'var(--space-3)' }}>{proposal.arg ?? '—'}</td>
                  <td style={{ padding: 'var(--space-3)', color: 'var(--color-success)', fontWeight: 'var(--font-medium)' }}>{proposal.yes}</td>
                  <td style={{ padding: 'var(--space-3)', color: 'var(--color-warning)', fontWeight: 'var(--font-medium)' }}>{proposal.no}</td>
                  <td style={{ padding: 'var(--space-3)' }}>{proposal.finalized ? 'Yes' : 'No'}</td>
                  <td style={{ padding: 'var(--space-3)' }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-1)',
                    }}>
                      {proposal.voters.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)' }}>No votes yet</span>
                      ) : (
                        proposal.voters.map((voter) => (
                          <span
                            key={voter}
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 'var(--text-xs)',
                              wordBreak: 'break-all',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {voter}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
        }}>
          <button
            type="button"
            onClick={handlePrevious}
            disabled={page <= 1 || isLoading}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              cursor: page <= 1 || isLoading ? 'default' : 'pointer',
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={page >= totalPages || isLoading}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              cursor: page >= totalPages || isLoading ? 'default' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}
    </Card>
  );
}
