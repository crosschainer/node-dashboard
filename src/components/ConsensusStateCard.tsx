import { Card } from './Card';
import { StatusIndicator } from './StatusIndicator';
import { LoadingSpinner } from './LoadingSpinner';
import { DashboardData, ConsensusVoteSet } from '../types/cometbft';

interface ConsensusStateCardProps {
  data: DashboardData;
}

const formatPercentage = (value: number | null, fallback: string = '—') => {
  if (value === null || Number.isNaN(value)) {
    return fallback;
  }

  return `${(value * 100).toFixed(1)}%`;
};

const STEP_LABELS: Record<number, { label: string; description: string }> = {
  0: {
    label: 'New Height',
    description: 'Moving commits for the previous height and preparing a new round.',
  },
  1: {
    label: 'Proposal',
    description: 'Designated proposer is broadcasting the block proposal for this round.',
  },
  2: {
    label: 'Prevote',
    description: 'Validators are evaluating the proposal and broadcasting prevotes.',
  },
  3: {
    label: 'Prevote Wait',
    description: 'Waiting for +2/3 prevotes or the timeout to expire.',
  },
  4: {
    label: 'Precommit',
    description: 'Validators are locking on the PoLC and broadcasting precommits.',
  },
  5: {
    label: 'Precommit Wait',
    description: 'Waiting for +2/3 precommits or the timeout to expire.',
  },
  6: {
    label: 'Commit',
    description: 'Block reached +2/3 precommits and nodes are finalising the commit.',
  },
};

const parseNumeric = (value: string | number | undefined | null): number | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const getStepInfo = (step: string | number | undefined) => {
  if (step === undefined || step === null) {
    return { label: 'Unknown', description: 'The node has not reported a consensus step yet.', value: null };
  }

  if (typeof step === 'string' && Number.isNaN(Number(step))) {
    const normalised = step.toLowerCase();
    const stepEntry = Object.entries(STEP_LABELS).find(([, info]) =>
      normalised.includes(info.label.toLowerCase()),
    );
    const entry = stepEntry?.[1];
    const numericValue = stepEntry ? Number(stepEntry[0]) : null;
    return {
      label: entry?.label ?? step,
      description: entry?.description ?? 'Consensus step as reported by the node.',
      value: numericValue,
    };
  }

  const numeric = typeof step === 'number' ? step : parseInt(step, 10);
  const entry = STEP_LABELS[numeric];

  return {
    label: entry?.label ?? `${Number.isFinite(numeric) ? numeric : step}`,
    description: entry?.description ?? 'Consensus step as reported by the node.',
    value: Number.isFinite(numeric) ? numeric : null,
  };
};

interface VoteProgress {
  total: number;
  counted: number;
  missing: number;
  ratio: number | null;
  threshold: number;
  reached: boolean;
}

const createVoteProgress = (total: number, counted: number): VoteProgress => {
  const safeTotal = Math.max(0, total);
  const safeCounted = Math.max(0, Math.min(counted, safeTotal));
  const threshold = safeTotal > 0
    ? Math.min(safeTotal, Math.floor((2 * safeTotal) / 3) + 1)
    : 0;

  return {
    total: safeTotal,
    counted: safeCounted,
    missing: Math.max(safeTotal - safeCounted, 0),
    ratio: safeTotal > 0 ? safeCounted / safeTotal : null,
    threshold,
    reached: threshold > 0 ? safeCounted >= threshold : false,
  };
};

const parseBitArray = (bitArray?: string): VoteProgress | null => {
  if (!bitArray) {
    return null;
  }

  const match = bitArray.match(/BA\{(\d+):([^}]*)\}/i);
  if (!match) {
    return null;
  }

  const total = parseInt(match[1], 10);
  const bits = match[2];

  if (!Number.isFinite(total) || total <= 0 || !bits) {
    return null;
  }

  const counted = Array.from(bits).reduce((sum, char) => {
    if ('xXtT1+'.includes(char)) {
      return sum + 1;
    }
    return sum;
  }, 0);

  return createVoteProgress(total, counted);
};

const isMeaningfulVote = (vote: string | null): vote is string =>
  typeof vote === 'string' && vote.trim().length > 0;

const isAffirmativeVote = (vote: string) => !/<nil>/i.test(vote) && !/nil-vote/i.test(vote);

const parseVotesList = (votes?: (string | null)[]): VoteProgress | null => {
  if (!votes || votes.length === 0) {
    return null;
  }

  const meaningfulVotes = votes.filter(isMeaningfulVote);
  if (meaningfulVotes.length === 0) {
    return null;
  }

  const affirmativeVotes = meaningfulVotes.filter(isAffirmativeVote);
  return createVoteProgress(meaningfulVotes.length, affirmativeVotes.length);
};

const combineVoteProgress = (
  bitArray?: string,
  votes?: (string | null)[],
): VoteProgress | null => {
  const bitArrayProgress = parseBitArray(bitArray);
  const votesProgress = parseVotesList(votes);

  if (!bitArrayProgress && !votesProgress) {
    return null;
  }

  if (bitArrayProgress && votesProgress) {
    const total = Math.max(bitArrayProgress.total, votesProgress.total);
    const counted = Math.max(bitArrayProgress.counted, votesProgress.counted);
    return createVoteProgress(total, counted);
  }

  return bitArrayProgress ?? votesProgress ?? null;
};

const getVoteSetForRound = (voteSets: ConsensusVoteSet[] | undefined, round: number | null) => {
  if (!voteSets || voteSets.length === 0) {
    return undefined;
  }

  if (round === null) {
    return voteSets[voteSets.length - 1];
  }

  return (
    voteSets.find((set) => {
      const setRound = parseNumeric(set.round);
      return setRound === round;
    }) ?? voteSets[voteSets.length - 1]
  );
};

const getVoteProgress = (
  voteSet: ConsensusVoteSet | undefined,
  type: 'prevotes' | 'precommits',
): VoteProgress | null => {
  if (!voteSet) {
    return null;
  }

  if (type === 'prevotes') {
    return combineVoteProgress(voteSet.prevotes_bit_array, voteSet.prevotes);
  }

  return combineVoteProgress(voteSet.precommits_bit_array, voteSet.precommits);
};

const renderVoteProgress = (
  label: string,
  progress: VoteProgress | null,
) => {
  const progressRatio = progress
    ? Math.max(0, Math.min(1, Number(progress.ratio ?? 0)))
    : 0;
  const ratioText = progress?.ratio !== null && progress?.ratio !== undefined
    ? formatPercentage(progress.ratio)
    : '—';

  const thresholdRemaining = progress && !progress.reached
    ? Math.max(progress.threshold - progress.counted, 0)
    : 0;

  const thresholdPercent = progress && progress.total > 0
    ? Math.max(0, Math.min(100, (progress.threshold / progress.total) * 100))
    : 66.6;

  return (
    <div
      key={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        padding: 'var(--space-3)',
        background: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{label}</strong>
        <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>{ratioText}</span>
      </div>

      <div
        aria-hidden
        style={{
          position: 'relative',
          width: '100%',
          height: '12px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progressRatio * 100}%`,
            height: '100%',
            background: label.includes('Precommit') ? 'var(--color-accent)' : 'var(--color-primary)',
            transition: 'width 0.3s ease',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${thresholdPercent}%`,
            top: 0,
            bottom: 0,
            width: '2px',
            background: 'rgba(255, 255, 255, 0.24)',
          }}
          title="+2/3 voting power threshold"
        />
      </div>

      <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', lineHeight: 1.4 }}>
        {progress ? (
          <>
            <div>{progress.counted}/{progress.total} votes seen</div>
            <div>
              {progress.reached
                ? '+2/3 threshold reached'
                : `Need ${thresholdRemaining} more to reach +2/3`}
            </div>
          </>
        ) : (
          'No votes seen yet this round.'
        )}
      </div>
    </div>
  );
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '—';
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
};

const formatRelative = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '—';
  }

  if (seconds < 1) {
    return 'just now';
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
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

  const roundHeight = parseNumeric(round_state.height);
  const roundNumber = parseNumeric(round_state.round);
  const stepInfo = getStepInfo(round_state.step);
  const proposerAddress = round_state.validators?.proposer?.address ?? null;

  const voteSets = round_state.votes ?? round_state.height_vote_set;
  const currentVoteSet = getVoteSetForRound(voteSets, roundNumber);
  const prevoteProgress = getVoteProgress(currentVoteSet, 'prevotes');
  const precommitProgress = getVoteProgress(currentVoteSet, 'precommits');

  const roundStart = new Date(round_state.start_time);
  const now = new Date();
  const roundDurationSeconds = Math.max(0, Math.round((now.getTime() - roundStart.getTime()) / 1000));
  const lastUpdatedSeconds = Math.max(0, Math.round((now.getTime() - data.health.lastUpdated.getTime()) / 1000));

  const lastCommitProgress = combineVoteProgress(
    round_state.last_commit?.votes_bit_array,
    round_state.last_commit?.votes,
  );

  const metricItems = [
    {
      label: 'Height',
      value: roundHeight !== null ? roundHeight.toLocaleString() : 'Unknown',
    },
    {
      label: 'Round',
      value: roundNumber !== null ? roundNumber.toLocaleString() : 'Unknown',
    },
    {
      label: 'Proposer',
      value: proposerAddress ? `${proposerAddress.slice(0, 8)}…${proposerAddress.slice(-6)}` : 'Unknown',
    },
  ];

  return (
    <Card title="Consensus State" glow={!consensusHealth.healthy}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <StatusIndicator
            status={consensusHealth.healthy ? 'success' : 'warning'}
            pulse={!consensusHealth.healthy}
          >
            {consensusHealth.healthy ? 'Consensus Healthy' : 'Consensus Issues Detected'}
          </StatusIndicator>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '999px',
                  background: 'rgba(0, 212, 255, 0.16)',
                  color: 'var(--text-accent)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-semibold)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {stepInfo.value !== null ? `Step ${stepInfo.value}` : 'Current Step'}
              </span>
              <span
                style={{
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--font-semibold)',
                }}
              >
                {stepInfo.label}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.6,
              }}
            >
              {stepInfo.description}
            </p>
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-2)',
                flexWrap: 'wrap',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
              }}
            >
              <span>In step {formatDuration(roundDurationSeconds)}</span>
              <span>Updated {formatRelative(lastUpdatedSeconds)}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 'var(--space-3)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
          }}
        >
          {metricItems.map((item) => (
            <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <strong
                style={{
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {item.label}
              </strong>
              <span>{item.value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h4
            style={{
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              margin: 0,
            }}
          >
            {roundNumber !== null && roundNumber > 0
              ? `Voting Progress (Round #${roundNumber})`
              : 'Voting Progress'}
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-3)',
            }}
          >
            {renderVoteProgress('Prevotes', prevoteProgress)}
            {renderVoteProgress('Precommits', precommitProgress)}
          </div>
        </div>

        {lastCommitProgress && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              padding: 'var(--space-3)',
              background: 'rgba(14, 165, 233, 0.08)',
              border: '1px solid rgba(14, 165, 233, 0.2)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <strong style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>Last Commit</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
              {lastCommitProgress.counted}/{lastCommitProgress.total} votes observed
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
              {lastCommitProgress.reached
                ? '+2/3 commit threshold met'
                : `Need ${Math.max(lastCommitProgress.threshold - lastCommitProgress.counted, 0)} more votes`}
            </span>
            <div
              aria-hidden
              style={{
                position: 'relative',
                width: '100%',
                height: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, (lastCommitProgress?.ratio ?? 0) * 100))}%`,
                  height: '100%',
                  background: 'var(--color-accent)',
                  transition: 'width 0.3s ease',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${lastCommitProgress ? (lastCommitProgress.threshold / lastCommitProgress.total) * 100 : 66.6}%`,
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  background: 'rgba(255, 255, 255, 0.24)',
                }}
                title="+2/3 voting power threshold"
              />
            </div>
          </div>
        )}

        {consensusHealth.issues.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <h4 style={{ color: 'var(--text-warning)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', margin: 0 }}>
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
