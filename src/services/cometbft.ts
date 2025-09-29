import {
  StatusResponse,
  NetInfoResponse,
  ABCIInfoResponse,
  UnconfirmedTxsResponse,
  ConsensusStateResponse,
  NodeHealth,
  DashboardData,
} from '../types/cometbft';

export class CometBFTService {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = 'https://node.xian.org', timeout: number = 10000) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout;
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
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

  private parseVoteRatio(bitArray?: string): number | null {
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

  private analyzeNodeHealth(
    status: StatusResponse | null,
    netInfo: NetInfoResponse | null,
    consensusState: ConsensusStateResponse | null,
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
    if (status.result.sync_info.catching_up) {
      health.errorMessages.push('Node is currently syncing');
    }

    // Check block height freshness (should be recent)
    const latestBlockTime = new Date(status.result.sync_info.latest_block_time);
    const now = new Date();
    const timeDiff = now.getTime() - latestBlockTime.getTime();
    const fiveMinutes = 5 * 60 * 1000;

    if (timeDiff > fiveMinutes) {
      health.hasErrors = true;
      health.errorMessages.push(`Latest block is ${Math.round(timeDiff / 60000)} minutes old`);
    }

    // Check peer count
    if (netInfo) {
      const peerCount = parseInt(netInfo.result.n_peers);
      if (peerCount === 0) {
        health.hasErrors = true;
        health.errorMessages.push('No peers connected');
      } else if (peerCount < 2) {
        health.errorMessages.push('Low peer count (less than 2)');
      }
    }

    if (!consensusState) {
      const message = 'Consensus state unavailable';
      health.consensus.issues.push(message);
      health.errorMessages.push(message);
      health.hasErrors = true;
    } else {
      const { round_state } = consensusState.result;
      const consensusIssues: string[] = [];

      health.consensus.height = parseInt(round_state.height, 10) || null;
      const roundValue =
        typeof round_state.round === 'number'
          ? round_state.round
          : parseInt(round_state.round as string, 10);
      health.consensus.round = Number.isFinite(roundValue) ? roundValue : null;
      const stepValue = round_state.step;
      health.consensus.step =
        stepValue !== undefined && stepValue !== null ? String(stepValue) : null;

      const stepNumber = (() => {
        if (typeof stepValue === 'number') {
          return Number.isFinite(stepValue) ? stepValue : null;
        }

        if (typeof stepValue === 'string') {
          const parsed = parseInt(stepValue, 10);
          return Number.isNaN(parsed) ? null : parsed;
        }

        return null;
      })();

      const latestBlockHeight = parseInt(status.result.sync_info.latest_block_height, 10);
      if (
        Number.isFinite(latestBlockHeight)
        && health.consensus.height !== null
        && Math.abs(latestBlockHeight - health.consensus.height) > 2
      ) {
        consensusIssues.push('Consensus height is lagging behind latest block height');
      }

      const voteSets = round_state.votes ?? round_state.height_vote_set;
      const voteSet = voteSets?.find((set) => {
        const round = typeof set.round === 'string' ? parseInt(set.round, 10) : set.round;
        return round === health.consensus.round;
      }) ?? voteSets?.[0];

      const prevoteRatio = this.parseVoteRatio(voteSet?.prevotes_bit_array);
      const precommitRatio = this.parseVoteRatio(voteSet?.precommits_bit_array);
      health.consensus.prevoteRatio = prevoteRatio;
      health.consensus.precommitRatio = precommitRatio;

      const participationThreshold = 2 / 3;

      if (
        stepNumber !== null
        && stepNumber >= 3
        && prevoteRatio !== null
        && prevoteRatio < participationThreshold
      ) {
        consensusIssues.push('Prevote participation below two-thirds threshold');
      }

      if (
        stepNumber !== null
        && stepNumber >= 5
        && precommitRatio !== null
        && precommitRatio < participationThreshold
      ) {
        consensusIssues.push('Precommit participation below two-thirds threshold');
      }

      if (consensusIssues.length > 0) {
        health.hasErrors = true;
        health.errorMessages.push(...consensusIssues);
      }

      health.consensus.issues = consensusIssues;
      health.consensus.healthy = consensusIssues.length === 0;
    }

    return health;
  }

  async getAllData(): Promise<DashboardData> {
    const data: DashboardData = {
      status: null,
      netInfo: null,
      abciInfo: null,
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
      },
      loading: true,
      error: null,
      consensusState: null,
    };

    try {
      // Fetch all data in parallel
      const [status, netInfo, abciInfo, mempool, consensusState] = await Promise.allSettled([
        this.getStatus(),
        this.getNetInfo(),
        this.getABCIInfo(),
        this.getUnconfirmedTxs(),
        this.getConsensusState(),
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

      // Analyze health
      data.health = this.analyzeNodeHealth(data.status, data.netInfo, data.consensusState);
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
      };
    }

    return data;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Export a default instance
export const cometbftService = new CometBFTService();