export interface NodeInfo {
  protocol_version: {
    p2p: string;
    block: string;
    app: string;
  };
  id: string;
  listen_addr: string;
  network: string;
  version: string;
  channels: string;
  moniker: string;
  other: {
    tx_index: string;
    rpc_address: string;
  };
}

export interface SyncInfo {
  latest_block_hash: string;
  latest_app_hash: string;
  latest_block_height: string;
  latest_block_time: string;
  earliest_block_hash: string;
  earliest_app_hash: string;
  earliest_block_height: string;
  earliest_block_time: string;
  catching_up: boolean;
}

export interface ValidatorInfo {
  address: string;
  pub_key: {
    type: string;
    value: string;
  };
  voting_power: string;
}

export interface StatusResponse {
  jsonrpc: string;
  id: number;
  result: {
    node_info: NodeInfo;
    sync_info: SyncInfo;
    validator_info: ValidatorInfo;
  };
}

export interface PeerInfo {
  node_info: NodeInfo;
  is_outbound: boolean;
  connection_status: {
    Duration: string;
    SendMonitor: {
      Start: string;
      Bytes: string;
      Samples: string;
      InstRate: string;
      CurRate: string;
      AvgRate: string;
      PeakRate: string;
      BytesRem: string;
      Duration: string;
      Idle: string;
      TimeRem: string;
      Progress: number;
      Active: boolean;
    };
    RecvMonitor: {
      Start: string;
      Bytes: string;
      Samples: string;
      InstRate: string;
      CurRate: string;
      AvgRate: string;
      PeakRate: string;
      BytesRem: string;
      Duration: string;
      Idle: string;
      TimeRem: string;
      Progress: number;
      Active: boolean;
    };
    Channels: Array<{
      ID: number;
      SendQueueCapacity: string;
      SendQueueSize: string;
      Priority: string;
      RecentlySent: string;
    }>;
  };
  remote_ip: string;
}

export interface NetInfoResponse {
  jsonrpc: string;
  id: number;
  result: {
    listening: boolean;
    listeners: string[];
    n_peers: string;
    peers: PeerInfo[];
  };
}

export interface ABCIInfoResponse {
  jsonrpc: string;
  id: number;
  result: {
    response: {
      version: string;
      app_version: string;
      last_block_height: string;
      last_block_app_hash: string;
    };
  };
}

export interface UnconfirmedTxsResponse {
  jsonrpc: string;
  id: number;
  result: {
    n_txs: string;
    total: string;
    total_bytes: string;
    txs: string[];
  };
}

export interface ABCIQueryResponse {
  jsonrpc: string;
  id: number;
  result: {
    response: {
      code: number;
      log: string;
      info: string;
      index: string;
      key: string | null;
      value: string | null;
      proofOps: unknown;
      height: string;
      codespace: string;
    };
  };
}

export interface ConsensusValidator {
  address: string;
  pub_key: {
    type: string;
    value: string;
  };
  voting_power: string;
  proposer_priority?: string;
}

export interface ConsensusValidatorSet {
  validators: ConsensusValidator[];
  proposer: ConsensusValidator;
}

export interface ConsensusVoteSet {
  round: number | string;
  prevotes: string[];
  prevotes_bit_array: string;
  precommits: string[];
  precommits_bit_array: string;
}

export interface ConsensusLastCommit {
  votes: string[];
  votes_bit_array: string;
  peer_maj_23s: Record<string, unknown>;
}

export interface ConsensusRoundState {
  height: string;
  round: number | string;
  step: number | string;
  start_time: string;
  commit_time?: string;
  validators?: ConsensusValidatorSet;
  proposal?: unknown;
  proposal_block?: unknown;
  proposal_block_parts?: unknown;
  locked_round?: number | string;
  locked_block?: unknown;
  locked_block_parts?: unknown;
  valid_round?: number | string;
  valid_block?: unknown;
  valid_block_parts?: unknown;
  votes?: ConsensusVoteSet[];
  height_vote_set?: ConsensusVoteSet[];
  commit_round?: number | string;
  last_commit?: ConsensusLastCommit;
  last_validators?: ConsensusValidatorSet;
  triggered_timeout_precommit?: boolean;
}

export interface ConsensusPeerRoundState {
  height: string;
  round: number | string;
  step: number | string;
  start_time: string;
  proposal: boolean;
  proposal_block_part_set_header: {
    total: number;
    hash: string;
  };
  proposal_block_parts: unknown;
  proposal_pol_round: number;
  proposal_pol: string;
  prevotes: string;
  precommits: string;
  last_commit_round: number;
  last_commit: string;
  catchup_commit_round: number;
  catchup_commit: string;
}

export interface ConsensusPeerState {
  node_address: string;
  peer_state: {
    round_state: ConsensusPeerRoundState;
    stats: {
      votes: string;
      block_parts: string;
    };
  };
}

export interface ConsensusStateResponse {
  jsonrpc: string;
  id: number;
  result: {
    round_state: ConsensusRoundState;
    peers?: ConsensusPeerState[];
  };
}

export interface ConsensusHealth {
  healthy: boolean;
  height: number | null;
  round: number | null;
  step: string | null;
  prevoteRatio: number | null;
  precommitRatio: number | null;
  issues: string[];
}

export interface ConsensusParticipationSample {
  timestamp: string;
  height: number | null;
  round: number | null;
  step: string | null;
  prevoteRatio: number | null;
  precommitRatio: number | null;
}

export interface NodeHealth {
  isOnline: boolean;
  isSynced: boolean;
  hasErrors: boolean;
  errorMessages: string[];
  lastUpdated: Date;
  consensus: ConsensusHealth;
}

export interface GovernanceProposal {
  id: number;
  yes: number;
  no: number;
  type: string;
  arg: number | string | null;
  voters: string[];
  finalized: boolean;
}

export interface GovernancePage {
  totalProposals: number;
  proposals: GovernanceProposal[];
  page: number;
  pageSize: number;
}

export interface DashboardData {
  status: StatusResponse | null;
  netInfo: NetInfoResponse | null;
  abciInfo: ABCIInfoResponse | null;
  mempool: UnconfirmedTxsResponse | null;
  consensusState: ConsensusStateResponse | null;
  health: NodeHealth;
  loading: boolean;
  error: string | null;
  consensusHistory: ConsensusParticipationSample[];
}
