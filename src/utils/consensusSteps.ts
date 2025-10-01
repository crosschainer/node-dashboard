export interface ConsensusStepMetadata {
  label: string;
  description: string;
  isCatchup?: boolean;
}

export const CONSENSUS_STEP_METADATA: Record<number, ConsensusStepMetadata> = {
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
  7: {
    label: 'Commit Wait',
    description: 'Waiting for the commit to finalise before moving to the next height.',
  },
  8: {
    label: 'Finalize Commit',
    description: 'Applying the committed block and preparing the next height.',
  },
  10: {
    label: 'Catch-up Commit',
    description: 'Node is replaying previously committed blocks while catching up with the chain.',
    isCatchup: true,
  },
  11: {
    label: 'Catch-up Wait',
    description: 'Waiting for catch-up commit processing to finish before moving to a new height.',
    isCatchup: true,
  },
  12: {
    label: 'Catch-up Replay',
    description: 'Node is replaying historical blocks to synchronise with the network.',
    isCatchup: true,
  },
  13: {
    label: 'Catch-up Replay Wait',
    description: 'Waiting for replay verification before resuming normal consensus operations.',
    isCatchup: true,
  },
};

const DEFAULT_DESCRIPTION = 'Consensus step as reported by the node.';
const DEFAULT_CATCHUP_DESCRIPTION =
  'Node is replaying previously committed blocks before rejoining live consensus.';
const UNKNOWN_DESCRIPTION = 'The node has not reported a consensus step yet.';

const CATCHUP_STEP_THRESHOLD = 10;
const CATCHUP_INDICATORS = ['catchup', 'catch-up', 'replay', 'wrong last block', 'wait last block'];

export interface NormalizedConsensusStep {
  raw: string | number | null;
  code: number | null;
  label: string | null;
  description: string;
  isCatchup: boolean;
}

const normaliseLabel = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  return value.trim() || null;
};

export const normalizeConsensusStep = (
  step: string | number | null | undefined,
): NormalizedConsensusStep => {
  if (step === undefined || step === null) {
    return {
      raw: null,
      code: null,
      label: null,
      description: UNKNOWN_DESCRIPTION,
      isCatchup: false,
    };
  }

  let code: number | null = null;
  let label: string | null = null;
  let description = DEFAULT_DESCRIPTION;

  if (typeof step === 'number') {
    code = Number.isFinite(step) ? step : null;
  } else if (typeof step === 'string') {
    const trimmed = step.trim();
    const parsed = parseInt(trimmed, 10);
    if (!Number.isNaN(parsed)) {
      code = parsed;
    } else {
      label = trimmed;
    }
  }

  if (code !== null) {
    const metadata = CONSENSUS_STEP_METADATA[code];
    if (metadata) {
      label = metadata.label;
      description = metadata.description;
    } else {
      if (code >= CATCHUP_STEP_THRESHOLD) {
        label = `Catch-up (step ${code})`;
        description = DEFAULT_CATCHUP_DESCRIPTION;
      } else {
        label = `Step ${code}`;
      }
    }
  }

  let normalizedLabel = normaliseLabel(label ?? (typeof step === 'string' ? step : null));

  const normalizedText = normalizedLabel?.toLowerCase() ??
    (typeof step === 'string' ? step.toLowerCase() : '');

  let isCatchup = false;

  if (normalizedLabel) {
    const entry = Object.entries(CONSENSUS_STEP_METADATA).find(([, meta]) =>
      normalizedLabel?.toLowerCase() === meta.label.toLowerCase(),
    );
    if (entry) {
      const [entryCode, meta] = entry;
      if (code === null) {
        code = Number(entryCode);
      }
      description = meta.description;
      if (meta.isCatchup) {
        isCatchup = true;
      }
    }
  }

  if (!isCatchup && code !== null) {
    const metadata = CONSENSUS_STEP_METADATA[code];
    if (metadata?.isCatchup) {
      isCatchup = true;
    } else if (code >= CATCHUP_STEP_THRESHOLD) {
      isCatchup = true;
    }
  }

  if (!isCatchup && normalizedText) {
    isCatchup = CATCHUP_INDICATORS.some((indicator) => normalizedText.includes(indicator));
  }

  if (isCatchup && description === DEFAULT_DESCRIPTION) {
    description = DEFAULT_CATCHUP_DESCRIPTION;
  }

  if (!normalizedLabel) {
    normalizedLabel = typeof step === 'string' ? step : null;
  }

  return {
    raw: typeof step === 'string' || typeof step === 'number' ? step : null,
    code,
    label: normalizedLabel,
    description,
    isCatchup,
  };
};
