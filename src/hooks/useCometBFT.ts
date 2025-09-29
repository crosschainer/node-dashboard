import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardData, ConsensusParticipationSample } from '../types/cometbft';
import { cometbftService } from '../services/cometbft';

interface UseCometBFTOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
  nodeUrl?: string;
}

export function useCometBFT(options: UseCometBFTOptions = {}) {
  const {
    refreshInterval = 5000, // 5 seconds
    autoRefresh = true,
    nodeUrl
  } = options;

  const [data, setData] = useState<DashboardData>({
    status: null,
    netInfo: null,
    abciInfo: null,
    mempool: null,
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
    },
    loading: true,
    error: null,
    consensusHistory: [],
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update node URL if provided
  useEffect(() => {
    if (nodeUrl) {
      cometbftService.setBaseUrl(nodeUrl);
    }
  }, [nodeUrl]);

  const fetchData = useCallback(async () => {
    try {
      const newData = await cometbftService.getAllData();
      const sample: ConsensusParticipationSample | null = (() => {
        if (!newData.consensusState) {
          return null;
        }

        const consensus = newData.health.consensus;
        return {
          timestamp: new Date().toISOString(),
          height: consensus.height,
          round: consensus.round,
          step: consensus.step,
          prevoteRatio: consensus.prevoteRatio,
          precommitRatio: consensus.precommitRatio,
        };
      })();

      setData((previous) => {
        const history = [...previous.consensusHistory];

        if (sample) {
          const lastEntry = history[history.length - 1];
          const isDuplicate =
            lastEntry
            && lastEntry.height === sample.height
            && lastEntry.round === sample.round
            && lastEntry.prevoteRatio === sample.prevoteRatio
            && lastEntry.precommitRatio === sample.precommitRatio;

          if (!isDuplicate) {
            history.push(sample);
          }

          const maxSamples = 50;
          if (history.length > maxSamples) {
            history.splice(0, history.length - maxSamples);
          }
        }

        return {
          ...newData,
          consensusHistory: history,
        };
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data',
        consensusState: null,
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
        },
        consensusHistory: prev.consensusHistory,
      }));
    }
  }, [nodeUrl]);

  const startAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }
  }, [fetchData, autoRefresh, refreshInterval]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh();
    };
  }, [stopAutoRefresh]);

  return {
    data,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    isLoading: data.loading,
    error: data.error,
    health: data.health,
  };
}