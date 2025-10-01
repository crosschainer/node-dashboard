import {
  StatusResponse,
  NetInfoResponse,
  ABCIInfoResponse,
  UnconfirmedTxsResponse,
  ConsensusStateResponse,
  NodeHealth,
  DashboardData,
  ConsensusVoteSet,
  ABCIQueryResponse,
  GovernanceProposal,
  GovernanceArgument,
  CommitResponse,
} from '../types/cometbft';
import { buildNodeConnection, DEFAULT_NODE_ADDRESS } from '../utils/nodeConnection';
import { normalizeConsensusStep } from '../utils/consensusSteps';

const APP_HASH_DIVERGENCE_DELAY_MS = 5000;

export class CometBFTService {
  private baseUrl: string;
  private timeout: number;
  private appHashDivergenceCandidate: {
    height: number;
    firstDetectedAt: number;
    confirmed: boolean;
  } | null = null;
  private graphqlProbeUrl: string | null;

  constructor(baseUrl?: string, timeout: number = 10000) {
    const defaultConnection = buildNodeConnection(DEFAULT_NODE_ADDRESS);
    const resolvedBaseUrl = (baseUrl ?? defaultConnection.baseUrl).replace(/\/$/, '');

    this.baseUrl = resolvedBaseUrl; // Remove trailing slash
    this.timeout = timeout;
    this.graphqlProbeUrl = defaultConnection.graphqlProbeUrl;
  }

  private buildAbciQueryUrl(path: string, data?: string): string {
    const quotedPath = `"${path}"`;
    const params = new URLSearchParams();
    params.set('path', quotedPath);

    if (typeof data === 'string') {
      params.set('data', data);
    }

    // URLSearchParams encodes forward slashes; decode them for compatibility with CometBFT RPC
    const query = params
      .toString()
      .replace(/%2F/g, '/')
      .replace(/%3A/g, ':');
    return `${this.baseUrl}/abci_query?${query}`;
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers = new Headers({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      });

      if (options.headers) {
        const customHeaders = new Headers(options.headers as HeadersInit);
        customHeaders.forEach((value, key) => {
          headers.set(key, value);
        });
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private decodeBase64Value(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    try {
      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        const binary = window.atob(value);
        if (typeof TextDecoder !== 'undefined') {
          const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
          return new TextDecoder().decode(bytes);
        }
        return binary;
      }

      if (typeof atob === 'function') {
        const binary = atob(value);
        if (typeof TextDecoder !== 'undefined') {
          const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
          return new TextDecoder().decode(bytes);
        }
        return binary;
      }

      if (typeof Buffer !== 'undefined') {
        return Buffer.from(value, 'base64').toString('utf-8');
      }
    } catch (error) {
      console.warn('Failed to decode base64 value', error);
    }

    return null;
  }

  private normalizeGovernanceProposal(proposalId: number, payload: unknown): GovernanceProposal {
    const record = (typeof payload === 'object' && payload !== null)
      ? (payload as Record<string, unknown>)
      : {};

    const yes = Number(record.yes ?? 0);
    const no = Number(record.no ?? 0);
    const type = typeof record.type === 'string' ? record.type : 'unknown';
    const finalized = Boolean(record.finalized);

    let arg: GovernanceArgument = null;
    if (typeof record.arg === 'number' || typeof record.arg === 'boolean') {
      arg = record.arg;
    } else if (typeof record.arg === 'string') {
      const rawArg = record.arg.trim();
      if (rawArg.length > 0) {
        const numericArg = Number(rawArg);
        if (!Number.isNaN(numericArg) && String(numericArg) === rawArg) {
          arg = numericArg;
        } else {
          try {
            if (rawArg.startsWith('{') || rawArg.startsWith('[')) {
              const parsed = JSON.parse(rawArg);
              if (parsed !== null && typeof parsed === 'object') {
                arg = Array.isArray(parsed)
                  ? (parsed as unknown[])
                  : (parsed as Record<string, unknown>);
              } else {
                arg = parsed as GovernanceArgument;
              }
            } else {
              arg = rawArg;
            }
          } catch (error) {
            arg = rawArg;
          }
        }
      } else {
        arg = '';
      }
    } else if (Array.isArray(record.arg)) {
      arg = record.arg as unknown[];
    } else if (typeof record.arg === 'object' && record.arg !== null) {
      arg = record.arg as Record<string, unknown>;
    }

    const voters = Array.isArray(record.voters)
      ? (record.voters as unknown[]).filter((entry): entry is string => typeof entry === 'string')
      : [];

    return {
      id: proposalId,
      yes: Number.isFinite(yes) ? yes : 0,
      no: Number.isFinite(no) ? no : 0,
      type,
      arg,
      voters,
      finalized,
    };
  }

  private async queryAbci(path: string, data?: string): Promise<ABCIQueryResponse> {
    const url = this.buildAbciQueryUrl(path, data);
    const response = await this.fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const payload = await response.json() as ABCIQueryResponse;
    const abciResponse = payload?.result?.response;

    if (!abciResponse) {
      throw new Error('Malformed ABCI query response');
    }

    if (abciResponse.code !== 0) {
      const errorMessage = abciResponse.log || `ABCI query failed with code ${abciResponse.code}`;
      throw new Error(errorMessage);
    }

    return payload;
  }

  async getStatus(): Promise<StatusResponse> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/status`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getNetInfo(): Promise<NetInfoResponse> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/net_info`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch net info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getABCIInfo(): Promise<ABCIInfoResponse> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/abci_info`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch ABCI info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCommit(height?: number | string): Promise<CommitResponse> {
    const heightParam = (() => {
      if (typeof height === 'number') {
        return Number.isFinite(height) ? Math.max(0, Math.trunc(height)).toString() : '';
      }

      if (typeof height === 'string' && height.trim().length > 0) {
        return height.trim();
      }

      return '';
    })();

    const url = heightParam
      ? `${this.baseUrl}/commit?height=${encodeURIComponent(heightParam)}`
      : `${this.baseUrl}/commit`;

    try {
      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch commit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUnconfirmedTxs(limit: number = 100): Promise<UnconfirmedTxsResponse> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/unconfirmed_txs?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch mempool data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getConsensusState(): Promise<ConsensusStateResponse> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/dump_consensus_state`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch consensus state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getGovernanceTotalProposals(): Promise<number> {
    try {
      const response = await this.queryAbci('/get/masternodes.total_votes');
      const decoded = this.decodeBase64Value(response.result.response.value);

      if (!decoded) {
        return 0;
      }

      const total = Number(decoded.trim());
      if (!Number.isFinite(total)) {
        throw new Error(`Invalid total proposal count: ${decoded}`);
      }

      return total;
    } catch (error) {
      throw new Error(`Failed to fetch governance proposal count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getGovernanceProposal(proposalId: number): Promise<GovernanceProposal | null> {
    try {
      const response = await this.queryAbci(`/get/masternodes.votes:${proposalId}`);
      const decoded = this.decodeBase64Value(response.result.response.value);

      if (!decoded) {
        return null;
      }

      const parsed = JSON.parse(decoded) as unknown;
      return this.normalizeGovernanceProposal(proposalId, parsed);
    } catch (error) {
      console.warn(`Failed to load governance proposal ${proposalId}:`, error);
      return null;
    }
  }

  async getGovernanceProposalsRange(startId: number, endId: number): Promise<GovernanceProposal[]> {
    if (!Number.isFinite(startId) || !Number.isFinite(endId) || endId < startId) {
      return [];
    }

    const ids: number[] = [];
    for (let id = Math.max(1, Math.floor(startId)); id <= Math.floor(endId); id += 1) {
      ids.push(id);
    }

    const results = await Promise.all(ids.map((id) => this.getGovernanceProposal(id)));
    return results.filter((proposal): proposal is GovernanceProposal => proposal !== null);
  }

  private parseVoteRatioFromBitArray(bitArray?: string): number | null {
    if (!bitArray) {
      return null;
    }

    const match = bitArray.match(/BA\{(\d+):(.*)\}/);
    if (!match) {
      return null;
    }

    const total = parseInt(match[1], 10);
    const votesString = match[2];

    if (!Number.isFinite(total) || total === 0 || !votesString) {
      return null;
    }

    const voteCount = (votesString.match(/[xX1]/g) || []).length;
    return voteCount / total;
  }

  private parseVoteRatioFromVotes(votes?: string[]): number | null {
    if (!votes || votes.length === 0) {
      return null;
    }

    const meaningfulVotes = votes.filter((vote) => typeof vote === 'string' && vote.trim().length > 0);
    if (meaningfulVotes.length === 0) {
      return null;
    }

    const affirmativeVotes = meaningfulVotes.filter((vote) => !vote.includes('<nil>') && !/nil-vote/i.test(vote));
    return affirmativeVotes.length / meaningfulVotes.length;
  }

  private calculateVoteRatio(voteSet: ConsensusVoteSet | undefined, type: 'prevotes' | 'precommits'): number | null {
    if (!voteSet) {
      return null;
    }

    const bitArray = type === 'prevotes' ? voteSet.prevotes_bit_array : voteSet.precommits_bit_array;
    const ratioFromBits = this.parseVoteRatioFromBitArray(bitArray);
    if (ratioFromBits !== null) {
      return ratioFromBits;
    }

    const votes = type === 'prevotes' ? voteSet.prevotes : voteSet.precommits;
    return this.parseVoteRatioFromVotes(votes);
  }

  private evaluateConsensusHealth(
    status: StatusResponse | null,
    consensusState: ConsensusStateResponse | null,
  ): NodeHealth['consensus'] {
    const consensusHealth: NodeHealth['consensus'] = {
      healthy: false,
      height: null,
      round: null,
      step: null,
      prevoteRatio: null,
      precommitRatio: null,
      issues: [],
    };

    if (!consensusState) {
      consensusHealth.issues.push('Consensus state unavailable');
      return consensusHealth;
    }

    const { round_state } = consensusState.result;

    consensusHealth.height = parseInt(round_state.height, 10) || null;

    const roundValue =
      typeof round_state.round === 'number'
        ? round_state.round
        : parseInt(round_state.round as string, 10);
    consensusHealth.round = Number.isFinite(roundValue) ? roundValue : null;

    const rawStepValue =
      typeof round_state.step === 'number' || typeof round_state.step === 'string'
        ? String(round_state.step)
        : null;
    const stepInfo = normalizeConsensusStep(round_state.step ?? null);
    consensusHealth.step = stepInfo.label ?? rawStepValue;

    const replayErrorIndicators = [
      'wrong block.header.lastresultshash',
      'wrong block.header.apphash',
      'wrong block.header.lastblockid',
      'wrong block.header.validatorshash',
      'wrong block.header.nextvalidatorshash',
      'error in validation',
      'failed to process committed block',
      'error on replay',
      'failed to replay',
      'cannot replay',
    ];

    const addReplayIssue = (source: string, message: string) => {
      if (!message) {
        return;
      }

      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        return;
      }

      const normalized = trimmedMessage.toLowerCase();
      const indicator = replayErrorIndicators.find((pattern) => normalized.includes(pattern));

      if (!indicator) {
        return;
      }

      const summary = trimmedMessage.length > 160
        ? `${trimmedMessage.slice(0, 157)}...`
        : trimmedMessage;

      const prefix = source ? `Consensus replay error detected (${source})` : 'Consensus replay error detected';
      const issueMessage = `${prefix}: ${summary}`;

      if (!consensusHealth.issues.includes(issueMessage)) {
        consensusHealth.issues.push(issueMessage);
      }
    };

    if (rawStepValue) {
      addReplayIssue('round step', rawStepValue);
    }

    if (stepInfo.isCatchup) {
      const catchupMessage = status?.result.sync_info.catching_up
        ? 'Node is stuck replaying blocks due to consensus catch-up issues'
        : 'Consensus step indicates catch-up mode despite sync being reported complete';
      consensusHealth.issues.push(catchupMessage);
    }

    const stepNumber = stepInfo.code;

    if (status) {
      const latestBlockHeight = parseInt(status.result.sync_info.latest_block_height, 10);
      if (
        Number.isFinite(latestBlockHeight)
        && consensusHealth.height !== null
        && Math.abs(latestBlockHeight - consensusHealth.height) > 2
      ) {
        consensusHealth.issues.push('Consensus height is lagging behind latest block height');
      }
    }

    const peers = consensusState.result.peers ?? [];
    peers.forEach((peer) => {
      addReplayIssue(`peer ${peer.node_address}`, peer.peer_state?.round_state?.catchup_commit);
      addReplayIssue(`peer ${peer.node_address}`, peer.peer_state?.round_state?.proposal_pol);
    });

    const voteSets = round_state.votes ?? round_state.height_vote_set;
    const voteSet = voteSets?.find((set) => {
      const round = typeof set.round === 'string' ? parseInt(set.round, 10) : set.round;
      return round === consensusHealth.round;
    }) ?? voteSets?.[0];

    const prevoteRatio = this.calculateVoteRatio(voteSet, 'prevotes');
    const precommitRatio = this.calculateVoteRatio(voteSet, 'precommits');
    consensusHealth.prevoteRatio = prevoteRatio;
    consensusHealth.precommitRatio = precommitRatio;

    const participationThreshold = 2 / 3;

    if (
      stepNumber !== null
      && stepNumber >= 3
      && prevoteRatio !== null
      && prevoteRatio < participationThreshold
    ) {
      consensusHealth.issues.push('Prevote participation below two-thirds threshold');
    }

    if (
      stepNumber !== null
      && stepNumber >= 5
      && precommitRatio !== null
      && precommitRatio < participationThreshold
    ) {
      consensusHealth.issues.push('Precommit participation below two-thirds threshold');
    }

    consensusHealth.healthy = consensusHealth.issues.length === 0;
    return consensusHealth;
  }

  public deriveConsensusHealth(
    status: StatusResponse | null,
    consensusState: ConsensusStateResponse | null,
  ): NodeHealth['consensus'] {
    return this.evaluateConsensusHealth(status, consensusState);
  }

  private analyzeNodeHealth(
    status: StatusResponse | null,
    consensusState: ConsensusStateResponse | null,
    abciInfo: ABCIInfoResponse | null,
    commit: CommitResponse | null,
    graphqlEnabled: boolean | null,
  ): NodeHealth {
    const health: NodeHealth = {
      isOnline: false,
      isSynced: false,
      hasErrors: false,
      errorMessages: [],
      lastUpdated: new Date(),
      consensus: {
        healthy: false,
        height: null,
        round: null,
        step: null,
        prevoteRatio: null,
        precommitRatio: null,
        issues: [],
      },
      graphqlEnabled,
    };

    if (!status) {
      health.hasErrors = true;
      health.errorMessages.push('Unable to fetch node status');
      if (!consensusState) {
        health.consensus.issues.push('Consensus state unavailable');
      }
      return health;
    }

    health.isOnline = true;

    // Check if node is synced
    health.isSynced = !status.result.sync_info.catching_up;

    // Check block height freshness (should be recent)
    const latestBlockTime = new Date(status.result.sync_info.latest_block_time);
    const now = new Date();
    const timeDiff = now.getTime() - latestBlockTime.getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (timeDiff > fiveMinutes && !status.result.sync_info.catching_up) {
      health.hasErrors = true;
      health.errorMessages.push(`Latest block is ${Math.round(timeDiff / 60000)} minutes old`);
    }

    const consensusHealth = this.evaluateConsensusHealth(status, consensusState);
    health.consensus = consensusHealth;

    if (consensusHealth.issues.length > 0) {
      health.hasErrors = true;
      health.errorMessages.push(...consensusHealth.issues);
    }

    const hasReplayIssue = consensusHealth.issues.some((issue) =>
      /replay error/i.test(issue) || /catch-up/.test(issue),
    );

    if (hasReplayIssue) {
      health.isSynced = false;
    }

    if (abciInfo && commit) {
      const abciResponse = abciInfo.result?.response;
      const header = commit.result?.signed_header?.header;

      const abciHeight = abciResponse?.last_block_height
        ? Number.parseInt(abciResponse.last_block_height, 10)
        : Number.NaN;
      const abciAppHash = typeof abciResponse?.last_block_app_hash === 'string'
        ? abciResponse.last_block_app_hash.trim()
        : '';
      const commitHeight = header?.height
        ? Number.parseInt(String(header.height), 10)
        : Number.NaN;
      const commitAppHash = typeof header?.app_hash === 'string'
        ? header.app_hash.trim()
        : '';
      const commitLastResultsHash = typeof header?.last_results_hash === 'string'
        ? header.last_results_hash.trim()
        : '';

      let hasDivergence = false;
      let divergenceHeight: number | null = null;

      if (!Number.isNaN(abciHeight) && !Number.isNaN(commitHeight) && abciAppHash.length > 0) {
        if (commitHeight === abciHeight && commitAppHash.length > 0) {
          hasDivergence = commitAppHash !== abciAppHash;
          divergenceHeight = commitHeight;
        } else if (commitHeight === abciHeight + 1 && commitLastResultsHash.length > 0) {
          hasDivergence = commitLastResultsHash !== abciAppHash;
          divergenceHeight = commitHeight;
        }
      }

      if (hasDivergence && divergenceHeight !== null) {
        const now = Date.now();
        let shouldReportDivergence = false;
        const candidate = this.appHashDivergenceCandidate;

        if (candidate && candidate.height === divergenceHeight) {
          if (
            candidate.confirmed
            || now - candidate.firstDetectedAt >= APP_HASH_DIVERGENCE_DELAY_MS
          ) {
            shouldReportDivergence = true;
            if (!candidate.confirmed) {
              this.appHashDivergenceCandidate = {
                ...candidate,
                confirmed: true,
              };
            }
          }
        } else {
          this.appHashDivergenceCandidate = {
            height: divergenceHeight,
            firstDetectedAt: now,
            confirmed: false,
          };
        }

        if (shouldReportDivergence) {
          health.hasErrors = true;
          health.errorMessages.push('Possible app-hash divergence — see node logs.');
        }
      } else {
        this.appHashDivergenceCandidate = null;
      }
    }

    // Deduplicate error messages to avoid repeated warnings
    health.errorMessages = Array.from(new Set(health.errorMessages));

    return health;
  }

  async getAllData(): Promise<DashboardData> {
    const data: DashboardData = {
      status: null,
      netInfo: null,
      abciInfo: null,
      commit: null,
      mempool: null,
      health: {
        isOnline: false,
        isSynced: false,
        hasErrors: true,
        errorMessages: ['Loading...'],
        lastUpdated: new Date(),
        consensus: {
          healthy: false,
          height: null,
          round: null,
          step: null,
          prevoteRatio: null,
          precommitRatio: null,
          issues: [],
        },
        graphqlEnabled: null,
      },
      loading: true,
      error: null,
      consensusState: null,
      consensusHistory: [],
    };

    try {
      // Fetch all data in parallel
      const [status, netInfo, abciInfo, mempool, consensusState, graphqlAvailability] = await Promise.allSettled([
        this.getStatus(),
        this.getNetInfo(),
        this.getABCIInfo(),
        this.getUnconfirmedTxs(),
        this.getConsensusState(),
        this.checkGraphqlAvailability(),
      ]);

      // Handle status
      if (status.status === 'fulfilled') {
        data.status = status.value;
      } else {
        data.error = `Status error: ${status.reason}`;
      }

      // Handle net info
      if (netInfo.status === 'fulfilled') {
        data.netInfo = netInfo.value;
      } else {
        console.warn('Net info error:', netInfo.reason);
      }

      // Handle ABCI info
      if (abciInfo.status === 'fulfilled') {
        data.abciInfo = abciInfo.value;
      } else {
        console.warn('ABCI info error:', abciInfo.reason);
      }

      // Handle mempool info
      if (mempool.status === 'fulfilled') {
        data.mempool = mempool.value;
      } else {
        console.warn('Mempool info error:', mempool.reason);
      }

      if (consensusState.status === 'fulfilled') {
        data.consensusState = consensusState.value;
      } else {
        console.warn('Consensus state error:', consensusState.reason);
      }

      const graphqlEnabled = graphqlAvailability.status === 'fulfilled'
        ? graphqlAvailability.value
        : (console.warn('GraphQL availability check failed:', graphqlAvailability.reason), null);

      const commitHeight = (() => {
        if (status.status === 'fulfilled') {
          const height = status.value.result?.sync_info?.latest_block_height;
          if (typeof height === 'string' && height.trim().length > 0) {
            return height.trim();
          }
        }

        if (abciInfo.status === 'fulfilled') {
          const height = abciInfo.value.result?.response?.last_block_height;
          if (typeof height === 'string' && height.trim().length > 0) {
            return height.trim();
          }
        }

        return null;
      })();

      if (commitHeight) {
        try {
          data.commit = await this.getCommit(commitHeight);
        } catch (error) {
          console.warn('Commit info error:', error);
        }
      }

      // Analyze health
      data.health = this.analyzeNodeHealth(
        data.status,
        data.consensusState,
        data.abciInfo,
        data.commit,
        graphqlEnabled,
      );
      data.health.lastUpdated = new Date();
      data.loading = false;

    } catch (error) {
      data.error = error instanceof Error ? error.message : 'Unknown error occurred';
      data.loading = false;
      data.health = {
        isOnline: false,
        isSynced: false,
        hasErrors: true,
        errorMessages: [data.error],
        lastUpdated: new Date(),
        consensus: {
          healthy: false,
          height: null,
          round: null,
          step: null,
          prevoteRatio: null,
          precommitRatio: null,
          issues: [data.error],
        },
        graphqlEnabled: null,
      };
      data.consensusHistory = [];
    }

    return data;
  }

  private async checkGraphqlAvailability(): Promise<boolean | null> {
    if (!this.graphqlProbeUrl) {
      return null;
    }

    try {
      const response = await this.fetchWithTimeout(this.graphqlProbeUrl, {
        headers: {
          'Accept': 'text/html,application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.warn('GraphQL probe request failed:', error);
      return false;
    }
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  setGraphqlProbeUrl(url: string | null) {
    this.graphqlProbeUrl = url ? url.replace(/\/$/, '') : null;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Export a default instance
export const cometbftService = new CometBFTService();