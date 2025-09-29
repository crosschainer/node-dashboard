import { ReactNode, useEffect, useState } from 'react';
import { GovernanceHookResult } from '../hooks/useGovernance';
import { Card } from './Card';
import { LoadingSpinner } from './LoadingSpinner';
import { RefreshIcon } from './Icons';

interface GovernanceCardProps {
  isValidator: boolean;
  governance: GovernanceHookResult;
}

type ProposalArgument = GovernanceHookResult['proposals'][number]['arg'];

function renderProposalArgument(arg: ProposalArgument): ReactNode {
  if (arg === null || typeof arg === 'undefined') {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }

  if (typeof arg === 'string') {
    const trimmed = arg.trim();
    if (!trimmed) {
      return <span style={{ color: 'var(--text-muted)' }}>—</span>;
    }
    return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{trimmed}</span>;
  }

  if (typeof arg === 'number' || typeof arg === 'boolean') {
    return <span style={{ fontFamily: 'var(--font-mono)' }}>{String(arg)}</span>;
  }

  if (Array.isArray(arg) || (typeof arg === 'object' && arg !== null)) {
    return (
      <pre
        style={{
          margin: 0,
          padding: 'var(--space-2)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-tertiary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
        }}
      >
        {JSON.stringify(arg, null, 2)}
      </pre>
    );
  }

  return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{String(arg)}</span>;
}

export function GovernanceCard({ isValidator, governance }: GovernanceCardProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);

    updateIsMobile();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateIsMobile);
    } else {
      mediaQuery.addListener(updateIsMobile);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', updateIsMobile);
      } else {
        mediaQuery.removeListener(updateIsMobile);
      }
    };
  }, []);

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


  const showingFrom = proposals.length > 0
    ? proposals[0].id
    : 0;
  const showingTo = proposals.length > 0
    ? proposals[proposals.length - 1].id
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
          {totalProposals && totalProposals > 0 && proposals.length > 0 && (

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

      {proposals.length > 0 && !isMobile && (
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
                  <td
                    style={{
                      padding: 'var(--space-3)',
                      verticalAlign: 'middle',
                    }}
                  >
                    {renderProposalArgument(proposal.arg)}
                  </td>
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

      {proposals.length > 0 && isMobile && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}>
          {proposals.map((proposal) => (
            <div
              key={proposal.id}
              style={{
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                padding: 'var(--space-3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-medium)' }}>
                  #{proposal.id}
                </span>
                <span style={{
                  textTransform: 'capitalize',
                  color: 'var(--text-secondary)',
                  fontWeight: 'var(--font-medium)',
                }}>
                  {proposal.type.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <span style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                  marginBottom: 'var(--space-1)',
                }}>
                  Argument
                </span>
                <div style={{ fontSize: 'var(--text-sm)' }}>
                  {renderProposalArgument(proposal.arg)}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 'var(--space-2)',
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-1)',
                  alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Yes</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 'var(--font-medium)' }}>
                    {proposal.yes}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-1)',
                  alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No</span>
                  <span style={{ color: 'var(--color-warning)', fontWeight: 'var(--font-medium)' }}>
                    {proposal.no}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-1)',
                  alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Finalized</span>
                  <span>{proposal.finalized ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div>
                <span style={{
                  display: 'block',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                  marginBottom: 'var(--space-1)',
                }}>
                  Voters
                </span>
                {proposal.voters.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)' }}>No votes yet</span>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-1)',
                  }}>
                    {proposal.voters.map((voter) => (
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
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
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
