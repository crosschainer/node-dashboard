import { StatusResponse, NetInfoResponse, ABCIInfoResponse, NodeHealth, DashboardData } from '../types/cometbft';

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

  async checkWebSocketStatus(): Promise<boolean> {
    try {
      // Try to connect to WebSocket endpoint
      const wsUrl = this.baseUrl.replace(/^https?/, 'wss').replace(/^http/, 'ws') + '/websocket';
      const ws = new WebSocket(wsUrl);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 3000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });
    } catch {
      return false;
    }
  }

  private analyzeNodeHealth(status: StatusResponse | null, netInfo: NetInfoResponse | null): NodeHealth {
    const health: NodeHealth = {
      isOnline: false,
      isSynced: false,
      hasErrors: false,
      errorMessages: [],
      lastUpdated: new Date(),
    };

    if (!status) {
      health.hasErrors = true;
      health.errorMessages.push('Unable to fetch node status');
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

    return health;
  }

  async getAllData(): Promise<DashboardData> {
    const data: DashboardData = {
      status: null,
      netInfo: null,
      abciInfo: null,
      health: {
        isOnline: false,
        isSynced: false,
        hasErrors: true,
        errorMessages: ['Loading...'],
        lastUpdated: new Date(),
      },
      loading: true,
      error: null,
    };

    try {
      // Fetch all data in parallel
      const [status, netInfo, abciInfo] = await Promise.allSettled([
        this.getStatus(),
        this.getNetInfo(),
        this.getABCIInfo(),
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

      // Analyze health
      data.health = this.analyzeNodeHealth(data.status, data.netInfo);
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