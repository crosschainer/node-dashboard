import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { GovernanceHookResult } from '../hooks/useGovernance';
import { Card } from './Card';
import { LoadingSpinner } from './LoadingSpinner';
import { RefreshIcon } from './Icons';
import XianWalletUtils from '../services/xianWalletUtils';
import { ConnectedWalletInfo } from '../hooks/useWallet';
import { Modal } from './Modal';

interface GovernanceCardProps {
  isValidator: boolean;
  governance: GovernanceHookResult;
  walletInfo: ConnectedWalletInfo | null;
  isConnectingWallet: boolean;
  onConnectWallet: () => void;
  walletError: string | null;
  clearWalletError: () => void;
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

function parseProposalArgument(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      console.warn('Failed to parse proposal argument as JSON', error);
    }
  }

  if (trimmed === 'true') {
    return true;
  }

  if (trimmed === 'false') {
    return false;
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }

  return trimmed;
}

export function GovernanceCard({
  isValidator,
  governance,
  walletInfo,
  isConnectingWallet,
  onConnectWallet,
  walletError,
  clearWalletError,
}: GovernanceCardProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [proposalType, setProposalType] = useState('');
  const [proposalArgument, setProposalArgument] = useState('');
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalSuccess, setProposalSuccess] = useState<string | null>(null);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [voteStatus, setVoteStatus] = useState<{ proposalId: number; direction: 'yes' | 'no' } | null>(null);
  const [voteMessage, setVoteMessage] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'finalized'>('all');

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

  const normalizedWalletAddress = useMemo(
    () => walletInfo?.address?.toLowerCase() ?? null,
    [walletInfo],
  );

  const openProposalModal = useCallback(() => {
    setProposalError(null);
    setProposalSuccess(null);
    clearWalletError();
    setIsProposalModalOpen(true);
  }, [clearWalletError]);

  const closeProposalModal = useCallback(() => {
    if (isSubmittingProposal) {
      return;
    }

    setIsProposalModalOpen(false);
    setProposalError(null);
    setProposalType('');
    setProposalArgument('');
  }, [isSubmittingProposal]);

  const handleConnectWallet = useCallback(() => {
    clearWalletError();
    setVoteMessage(null);
    setVoteError(null);
    setProposalSuccess(null);
    setProposalError(null);
    onConnectWallet();
  }, [clearWalletError, onConnectWallet]);

  const handleSubmitProposal = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setProposalError(null);
      setProposalSuccess(null);
      clearWalletError();

      if (!walletInfo) {
        setProposalError('Connect your wallet before creating a proposal.');
        return;
      }

      const trimmedType = proposalType.trim();
      if (!trimmedType) {
        setProposalError('Proposal type is required.');
        return;
      }

      const parsedArgument = parseProposalArgument(proposalArgument);

      try {
        setIsSubmittingProposal(true);
        const result = await XianWalletUtils.sendTransaction('masternodes', 'propose_vote', {
          type_of_vote: trimmedType,
          arg: parsedArgument,
        });

        if (result && 'errors' in result && result.errors) {
          throw new Error(Array.isArray(result.errors) ? result.errors.join(', ') : String(result.errors));
        }

        setProposalType('');
        setProposalArgument('');
        setProposalSuccess('Proposal submitted successfully.');
        setIsProposalModalOpen(false);
        refresh();
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : 'Failed to submit proposal';
        setProposalError(message);
      } finally {
        setIsSubmittingProposal(false);
      }
    },
    [clearWalletError, proposalArgument, proposalType, refresh, walletInfo],
  );

  const handleVote = useCallback(
    async (proposalId: number, direction: 'yes' | 'no') => {
      setVoteError(null);
      setVoteMessage(null);
      clearWalletError();

      if (!walletInfo) {
        setVoteError('Connect your wallet before voting.');
        return;
      }

      try {
        setVoteStatus({ proposalId, direction });
        const result = await XianWalletUtils.sendTransaction('masternodes', 'vote', {
          proposal_id: proposalId,
          vote: direction,
        });

        if (result && 'errors' in result && result.errors) {
          throw new Error(Array.isArray(result.errors) ? result.errors.join(', ') : String(result.errors));
        }

        setVoteMessage(`Vote submitted for proposal #${proposalId}.`);
        refresh();
      } catch (voteErr) {
        const message = voteErr instanceof Error ? voteErr.message : 'Failed to submit vote';
        setVoteError(message);
      } finally {
        setVoteStatus(null);
      }
    },
    [clearWalletError, refresh, walletInfo],
  );

  const filteredProposals = useMemo(() => {
    if (activeTab === 'active') {
      return proposals.filter((proposal) => !proposal.finalized);
    }

    if (activeTab === 'finalized') {
      return proposals.filter((proposal) => proposal.finalized);
    }

    return proposals;
  }, [activeTab, proposals]);

  const activeCount = useMemo(
    () => proposals.filter((proposal) => !proposal.finalized).length,
    [proposals],
  );

  const finalizedCount = useMemo(
    () => proposals.filter((proposal) => proposal.finalized).length,
    [proposals],
  );

  const tabOptions = useMemo(
    () => [
      { key: 'all' as const, label: `All (${proposals.length})` },
      { key: 'active' as const, label: `Active (${activeCount})` },
      { key: 'finalized' as const, label: `Finalized (${finalizedCount})` },
    ],
    [activeCount, finalizedCount, proposals.length],
  );

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

  const showingFrom = filteredProposals.length > 0
    ? filteredProposals[0].id
    : 0;
  const showingTo = filteredProposals.length > 0
    ? filteredProposals[filteredProposals.length - 1].id
    : 0;

  return (
    <Card title="Governance Votes">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-secondary)' }}>
            Wallet
          </span>
          <span
            style={{
              fontSize: 'var(--text-sm)',
              color: walletInfo ? 'var(--text-secondary)' : 'var(--text-muted)',
              fontFamily: walletInfo ? 'var(--font-mono)' : 'inherit',
            }}
          >
            {walletInfo ? (walletInfo.truncatedAddress ?? walletInfo.address) : 'No wallet connected'}
          </span>
          {walletInfo?.locked ? (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>
              Wallet is locked. Please unlock it before signing transactions.
            </span>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleConnectWallet}
            disabled={isConnectingWallet}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              cursor: isConnectingWallet ? 'default' : 'pointer',
            }}
          >
            {isConnectingWallet ? 'Connecting…' : walletInfo ? 'Reconnect Wallet' : 'Connect Wallet'}
          </button>
          <button
            type="button"
            onClick={openProposalModal}
            disabled={!walletInfo || walletInfo?.locked}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--primary-gradient)',
              color: 'white',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              cursor: !walletInfo || walletInfo?.locked ? 'default' : 'pointer',
              opacity: !walletInfo || walletInfo?.locked ? 0.7 : 1,
            }}
          >
            New Proposal
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-primary)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              cursor: isLoading ? 'default' : 'pointer',
            }}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                Refreshing…
              </>
            ) : (
              <>
                <RefreshIcon size={16} />
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {walletError ? (
        <div
          style={{
            marginBottom: 'var(--space-3)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 71, 87, 0.12)',
            color: 'var(--color-error)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {walletError}
        </div>
      ) : null}

      {proposalSuccess ? (
        <div
          style={{
            marginBottom: 'var(--space-3)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(52, 199, 89, 0.12)',
            color: 'var(--color-success)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {proposalSuccess}
        </div>
      ) : null}

      {voteMessage ? (
        <div
          style={{
            marginBottom: 'var(--space-3)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(52, 199, 89, 0.12)',
            color: 'var(--color-success)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {voteMessage}
        </div>
      ) : null}

      {voteError ? (
        <div
          style={{
            marginBottom: 'var(--space-3)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 71, 87, 0.12)',
            color: 'var(--color-error)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {voteError}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
          marginBottom: 'var(--space-3)',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Total proposals: {totalProposals ?? '—'}
          </p>
          {totalProposals && totalProposals > 0 && filteredProposals.length > 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                marginTop: 'var(--space-1)',
              }}
            >
              Showing IDs {showingFrom} – {showingTo}
            </p>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <span>Active: {activeCount}</span>
          <span>Finalized: {finalizedCount}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
        {tabOptions.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: isActive ? 'none' : '1px solid var(--border-primary)',
                background: isActive ? 'var(--primary-gradient)' : 'var(--bg-secondary)',
                color: isActive ? 'white' : 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
            >
              {label}
            </button>
          );
        })}
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

      {isLoading && filteredProposals.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6) 0' }}>
          <LoadingSpinner size="md" />
        </div>
      ) : null}

      {!isLoading && (totalProposals ?? 0) === 0 && !error ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          No governance proposals found.
        </p>
      ) : null}

      {!isLoading && (totalProposals ?? 0) > 0 && filteredProposals.length === 0 && !error ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          No proposals match this filter.
        </p>
      ) : null}

      {filteredProposals.length > 0 && !isMobile && (
        <div
          style={{
            overflowX: 'auto',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 'var(--text-sm)',
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: 'var(--space-3)' }}>ID</th>
                <th style={{ padding: 'var(--space-3)' }}>Type</th>
                <th style={{ padding: 'var(--space-3)' }}>Argument</th>
                <th style={{ padding: 'var(--space-3)' }}>Yes</th>
                <th style={{ padding: 'var(--space-3)' }}>No</th>
                <th style={{ padding: 'var(--space-3)' }}>Finalized</th>
                <th style={{ padding: 'var(--space-3)' }}>Voters</th>
                <th style={{ padding: 'var(--space-3)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map((proposal) => {
                const isVoting = voteStatus?.proposalId === proposal.id;
                const hasVoted = normalizedWalletAddress
                  ? proposal.voters.some((voter) => voter.toLowerCase() === normalizedWalletAddress)
                  : false;

                return (
                  <tr
                    key={proposal.id}
                    style={{
                      borderBottom: '1px solid var(--border-primary)',
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    <td style={{ padding: 'var(--space-3)', fontFamily: 'var(--font-mono)' }}>{proposal.id}</td>
                    <td style={{ padding: 'var(--space-3)', textTransform: 'capitalize' }}>
                      {proposal.type.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: 'var(--space-3)' }}>{renderProposalArgument(proposal.arg)}</td>
                    <td style={{ padding: 'var(--space-3)', color: 'var(--color-success)', fontWeight: 'var(--font-medium)' }}>
                      {proposal.yes}
                    </td>
                    <td style={{ padding: 'var(--space-3)', color: 'var(--color-warning)', fontWeight: 'var(--font-medium)' }}>
                      {proposal.no}
                    </td>
                    <td style={{ padding: 'var(--space-3)' }}>{proposal.finalized ? 'Yes' : 'No'}</td>
                    <td style={{ padding: 'var(--space-3)' }}>
                      {proposal.voters.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>No votes yet</span>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-1)',
                          }}
                        >
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
                    </td>
                    <td style={{ padding: 'var(--space-3)' }}>
                      {proposal.finalized ? (
                        <span style={{ color: 'var(--text-muted)' }}>Finalized</span>
                      ) : !walletInfo ? (
                        <span style={{ color: 'var(--text-muted)' }}>Connect wallet</span>
                      ) : hasVoted ? (
                        <span style={{ color: 'var(--text-secondary)' }}>Already voted</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button
                            type="button"
                            onClick={() => handleVote(proposal.id, 'yes')}
                            disabled={!!voteStatus || walletInfo?.locked}
                            style={{
                              padding: 'var(--space-1) var(--space-2)',
                              borderRadius: 'var(--radius-sm)',
                              border: 'none',
                              background: 'var(--color-success)',
                              color: 'white',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 'var(--font-medium)',
                              cursor: !!voteStatus || walletInfo?.locked ? 'default' : 'pointer',
                              opacity: !!voteStatus || walletInfo?.locked ? 0.7 : 1,
                            }}
                          >
                            {isVoting && voteStatus?.direction === 'yes' ? 'Voting…' : 'Vote Yes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVote(proposal.id, 'no')}
                            disabled={!!voteStatus || walletInfo?.locked}
                            style={{
                              padding: 'var(--space-1) var(--space-2)',
                              borderRadius: 'var(--radius-sm)',
                              border: 'none',
                              background: 'var(--color-warning)',
                              color: 'white',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 'var(--font-medium)',
                              cursor: !!voteStatus || walletInfo?.locked ? 'default' : 'pointer',
                              opacity: !!voteStatus || walletInfo?.locked ? 0.7 : 1,
                            }}
                          >
                            {isVoting && voteStatus?.direction === 'no' ? 'Voting…' : 'Vote No'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredProposals.length > 0 && isMobile && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {filteredProposals.map((proposal) => {
            const isVoting = voteStatus?.proposalId === proposal.id;
            const hasVoted = normalizedWalletAddress
              ? proposal.voters.some((voter) => voter.toLowerCase() === normalizedWalletAddress)
              : false;

            return (
              <div
                key={proposal.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)',
                  background: 'var(--bg-secondary)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 'var(--space-2)',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                      #{proposal.id}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-secondary)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {proposal.type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-muted)',
                        marginBottom: 'var(--space-1)',
                      }}
                    >
                      Argument
                    </span>
                    <div style={{ fontSize: 'var(--text-sm)' }}>{renderProposalArgument(proposal.arg)}</div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Yes</span>
                    <span style={{ color: 'var(--color-success)', fontWeight: 'var(--font-medium)' }}>{proposal.yes}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No</span>
                    <span style={{ color: 'var(--color-warning)', fontWeight: 'var(--font-medium)' }}>{proposal.no}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Finalized</span>
                    <span>{proposal.finalized ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    Voters
                  </span>
                  {proposal.voters.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)' }}>No votes yet</span>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-1)',
                      }}
                    >
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

                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    Actions
                  </span>
                  {proposal.finalized ? (
                    <span style={{ color: 'var(--text-muted)' }}>Finalized</span>
                  ) : !walletInfo ? (
                    <span style={{ color: 'var(--text-muted)' }}>Connect wallet</span>
                  ) : hasVoted ? (
                    <span style={{ color: 'var(--text-secondary)' }}>Already voted</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button
                        type="button"
                        onClick={() => handleVote(proposal.id, 'yes')}
                        disabled={!!voteStatus || walletInfo?.locked}
                        style={{
                          padding: 'var(--space-1) var(--space-2)',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          background: 'var(--color-success)',
                          color: 'white',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 'var(--font-medium)',
                          cursor: !!voteStatus || walletInfo?.locked ? 'default' : 'pointer',
                          opacity: !!voteStatus || walletInfo?.locked ? 0.7 : 1,
                        }}
                      >
                        {isVoting && voteStatus?.direction === 'yes' ? 'Voting…' : 'Vote Yes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVote(proposal.id, 'no')}
                        disabled={!!voteStatus || walletInfo?.locked}
                        style={{
                          padding: 'var(--space-1) var(--space-2)',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          background: 'var(--color-warning)',
                          color: 'white',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 'var(--font-medium)',
                          cursor: !!voteStatus || walletInfo?.locked ? 'default' : 'pointer',
                          opacity: !!voteStatus || walletInfo?.locked ? 0.7 : 1,
                        }}
                      >
                        {isVoting && voteStatus?.direction === 'no' ? 'Voting…' : 'Vote No'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && filteredProposals.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
          }}
        >
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

      <Modal isOpen={isProposalModalOpen} onClose={closeProposalModal} title="Create proposal">
        <form
          onSubmit={handleSubmitProposal}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Submit a governance proposal using your connected wallet.
            </p>
            {walletInfo ? (
              <p
                style={{
                  margin: 0,
                  marginTop: 'var(--space-1)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {walletInfo.truncatedAddress ?? walletInfo.address}
              </p>
            ) : (
              <p style={{ margin: 0, marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Connect your wallet before submitting a proposal.
              </p>
            )}
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Proposal Type</span>
            <input
              type="text"
              value={proposalType}
              onChange={(event) => setProposalType(event.target.value)}
              placeholder="e.g. add_member"
              style={{
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Proposal Argument</span>
            <textarea
              value={proposalArgument}
              onChange={(event) => setProposalArgument(event.target.value)}
              placeholder="Argument value (text, number, or JSON)"
              rows={4}
              style={{
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                resize: 'vertical',
              }}
            />
          </label>

          {proposalError ? (
            <span style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)' }}>{proposalError}</span>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={closeProposalModal}
              disabled={isSubmittingProposal}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                cursor: isSubmittingProposal ? 'default' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingProposal || !walletInfo || walletInfo?.locked}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--primary-gradient)',
                color: 'white',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)',
                cursor: isSubmittingProposal || !walletInfo || walletInfo?.locked ? 'default' : 'pointer',
                opacity: isSubmittingProposal || !walletInfo || walletInfo?.locked ? 0.7 : 1,
              }}
            >
              {isSubmittingProposal ? 'Submitting…' : 'Submit Proposal'}
            </button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
