import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardData, BlockTimeSample, MempoolDepthSample } from '../types/cometbft';
import { cometbftService } from '../services/cometbft';

interface UseCometBFTOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
  nodeUrl?: string;
  consensusRefreshInterval?: number;
  enableConsensusRealtime?: boolean;
  graphqlProbeUrl?: string | null;
}

export function useCometBFT(options: UseCometBFTOptions = {}) {
  const {
    refreshInterval = 2000, // 2 seconds for full refresh to keep mempool reactive
    autoRefresh = true,
    nodeUrl,
    consensusRefreshInterval = 1000,
    enableConsensusRealtime = true,
    graphqlProbeUrl = null,
  } = options;

  const [data, setData] = useState<DashboardData>({
    status: null,
    netInfo: null,
    abciInfo: null,
    commit: null,
    mempool: null,
    mempoolStats: null,
    consensusState: null,
    health: {
      isOnline: false,
      isSynced: false,
      hasErrors: true,
      errorMessages: ['Initializing...'],
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
    blockTimeHistory: [],
    mempoolDepthHistory: [],
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const consensusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update node URL if provided
  useEffect(() => {
    if (nodeUrl) {
      cometbftService.setBaseUrl(nodeUrl);
    }
    cometbftService.setGraphqlProbeUrl(graphqlProbeUrl ?? null);
  }, [nodeUrl, graphqlProbeUrl]);

  const fetchData = useCallback(async () => {
    try {
      const newData = await cometbftService.getAllData();
      setData((previous) => {
        const blockTimeHistory = (() => {
          const existing = [...previous.blockTimeHistory];
          const syncInfo = newData.status?.result?.sync_info;

          if (!syncInfo) {
            return existing;
          }

          const heightValue = typeof syncInfo.latest_block_height === 'string'
            ? Number.parseInt(syncInfo.latest_block_height, 10)
            : Number.NaN;
          const blockHeight = Number.isFinite(heightValue) ? heightValue : null;
          const blockTimestamp = typeof syncInfo.latest_block_time === 'string'
            ? syncInfo.latest_block_time
            : null;

          const lastEntry = existing[existing.length - 1];
          const isDuplicate = lastEntry
            && lastEntry.blockHeight === blockHeight
            && lastEntry.blockTimestamp === blockTimestamp;

          if (isDuplicate) {
            return existing;
          }

          let blockIntervalMs: number | null = null;

          if (blockTimestamp) {
            const currentTime = new Date(blockTimestamp);
            if (!Number.isNaN(currentTime.getTime()) && lastEntry?.blockTimestamp) {
              const previousTime = new Date(lastEntry.blockTimestamp);
              if (!Number.isNaN(previousTime.getTime())) {
                const delta = currentTime.getTime() - previousTime.getTime();
                if (Number.isFinite(delta) && delta >= 0) {
                  const hasAdvancedHeight = blockHeight !== null
                    && lastEntry.blockHeight !== null
                    ? blockHeight > lastEntry.blockHeight
                    : true;

                  blockIntervalMs = hasAdvancedHeight ? delta : null;
                }
              }
            }
          }

          const sampleEntry: BlockTimeSample = {
            timestamp: new Date().toISOString(),
            blockHeight,
            blockTimestamp,
            blockIntervalMs,
          };

          existing.push(sampleEntry);

          const maxSamples = 50;
          if (existing.length > maxSamples) {
            existing.splice(0, existing.length - maxSamples);
          }

          return existing;
        })();

        const mempoolDepthHistory = (() => {
          const existing = [...previous.mempoolDepthHistory];
          const mempoolInfo = newData.mempoolStats?.result ?? newData.mempool?.result;

          if (!mempoolInfo) {
            return existing;
          }

          const totalTxsValue = typeof mempoolInfo.total === 'string'
            ? Number.parseInt(mempoolInfo.total, 10)
            : Number.NaN;
          const pendingTxsValue = typeof mempoolInfo.n_txs === 'string'
            ? Number.parseInt(mempoolInfo.n_txs, 10)
            : Number.NaN;
          const totalBytesValue = typeof mempoolInfo.total_bytes === 'string'
            ? Number.parseInt(mempoolInfo.total_bytes, 10)
            : Number.NaN;

          const totalTxs = Number.isFinite(totalTxsValue) ? totalTxsValue : null;
          const pendingTxs = Number.isFinite(pendingTxsValue) ? pendingTxsValue : null;
          const totalBytes = Number.isFinite(totalBytesValue) ? totalBytesValue : null;

          const lastEntry = existing[existing.length - 1];
          const isDuplicate = lastEntry
            && lastEntry.totalTxs === totalTxs
            && lastEntry.pendingTxs === pendingTxs
            && lastEntry.totalBytes === totalBytes;

          if (isDuplicate) {
            return existing;
          }

          const sampleEntry: MempoolDepthSample = {
            timestamp: new Date().toISOString(),
            totalTxs,
            totalBytes,
            pendingTxs,
          };

          existing.push(sampleEntry);

          const maxSamples = 50;
          if (existing.length > maxSamples) {
            existing.splice(0, existing.length - maxSamples);
          }

          return existing;
        })();

        return {
          ...newData,
          blockTimeHistory,
          mempoolDepthHistory,
        };
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data',
        consensusState: null,
        commit: null,
        health: {
          isOnline: false,
          isSynced: false,
          hasErrors: true,
          errorMessages: [error instanceof Error ? error.message : 'Failed to fetch data'],
          lastUpdated: new Date(),
          consensus: {
            healthy: false,
            height: null,
            round: null,
            step: null,
            prevoteRatio: null,
            precommitRatio: null,
            issues: [error instanceof Error ? error.message : 'Failed to fetch data'],
          },
          graphqlEnabled: null,
        },
        blockTimeHistory: prev.blockTimeHistory,
        mempoolDepthHistory: prev.mempoolDepthHistory,
      }));
    }
  }, [nodeUrl]);

  const fetchConsensusState = useCallback(async () => {
    if (!enableConsensusRealtime) {
      return;
    }

    try {
      const consensusState = await cometbftService.getConsensusState();

      setData((previous) => {
        const consensusHealth = cometbftService.deriveConsensusHealth(previous.status, consensusState);

        const nonConsensusErrors = previous.health.errorMessages.filter(
          (message) => !previous.health.consensus.issues.includes(message),
        );

        const combinedErrors = consensusHealth.issues.length > 0
          ? Array.from(new Set([...nonConsensusErrors, ...consensusHealth.issues]))
          : nonConsensusErrors;

        return {
          ...previous,
          consensusState,
          health: {
            ...previous.health,
            hasErrors: combinedErrors.length > 0,
            errorMessages: combinedErrors,
            consensus: consensusHealth,
          },
          loading: previous.loading,
          error: previous.error,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch consensus state';

      setData((previous) => {
        const nonConsensusErrors = previous.health.errorMessages.filter(
          (existing) => !previous.health.consensus.issues.includes(existing),
        );

        const errorMessages = Array.from(new Set([...nonConsensusErrors, message]));

        return {
          ...previous,
          consensusState: null,
          health: {
            ...previous.health,
            hasErrors: errorMessages.length > 0,
            errorMessages,
            consensus: {
              healthy: false,
              height: null,
              round: null,
              step: null,
              prevoteRatio: null,
              precommitRatio: null,
              issues: [message],
            },
          },
          loading: previous.loading,
          error: message,
        };
      });
    }
  }, [enableConsensusRealtime]);

  const startAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }
  }, [fetchData, autoRefresh, refreshInterval]);

  const startConsensusRealtime = useCallback(() => {
    if (consensusIntervalRef.current) {
      clearInterval(consensusIntervalRef.current);
    }

    if (autoRefresh && enableConsensusRealtime && consensusRefreshInterval > 0) {
      consensusIntervalRef.current = setInterval(fetchConsensusState, consensusRefreshInterval);
    }
  }, [autoRefresh, enableConsensusRealtime, consensusRefreshInterval, fetchConsensusState]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopConsensusRealtime = useCallback(() => {
    if (consensusIntervalRef.current) {
      clearInterval(consensusIntervalRef.current);
      consensusIntervalRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    await fetchData();
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh setup
  useEffect(() => {
    startAutoRefresh();
    return stopAutoRefresh;
  }, [startAutoRefresh, stopAutoRefresh]);

  useEffect(() => {
    if (enableConsensusRealtime && consensusRefreshInterval > 0) {
      fetchConsensusState();
    }
    startConsensusRealtime();
    return stopConsensusRealtime;
  }, [
    enableConsensusRealtime,
    consensusRefreshInterval,
    fetchConsensusState,
    startConsensusRealtime,
    stopConsensusRealtime,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh();
      stopConsensusRealtime();
    };
  }, [stopAutoRefresh, stopConsensusRealtime]);

  return {
    data,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    startConsensusRealtime,
    stopConsensusRealtime,
    isLoading: data.loading,
    error: data.error,
    health: data.health,
  };
}