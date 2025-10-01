import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardData, ConsensusParticipationSample } from '../types/cometbft';
import { cometbftService } from '../services/cometbft';

interface UseCometBFTOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
  nodeUrl?: string;
  consensusRefreshInterval?: number;
  enableConsensusRealtime?: boolean;
}

export function useCometBFT(options: UseCometBFTOptions = {}) {
  const {
    refreshInterval = 5000, // 5 seconds for full refresh
    autoRefresh = true,
    nodeUrl,
    consensusRefreshInterval = 1000,
    enableConsensusRealtime = true
  } = options;

  const [data, setData] = useState<DashboardData>({
    status: null,
    netInfo: null,
    abciInfo: null,
    commit: null,
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
  const consensusIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
        },
        consensusHistory: prev.consensusHistory,
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

        const history = (() => {
          if (!consensusState) {
            return previous.consensusHistory;
          }

          const sample: ConsensusParticipationSample = {
            timestamp: new Date().toISOString(),
            height: consensusHealth.height,
            round: consensusHealth.round,
            step: consensusHealth.step,
            prevoteRatio: consensusHealth.prevoteRatio,
            precommitRatio: consensusHealth.precommitRatio,
          };

          const existing = [...previous.consensusHistory];
          const lastEntry = existing[existing.length - 1];
          const isDuplicate =
            lastEntry
            && lastEntry.height === sample.height
            && lastEntry.round === sample.round
            && lastEntry.step === sample.step
            && lastEntry.prevoteRatio === sample.prevoteRatio
            && lastEntry.precommitRatio === sample.precommitRatio;

          if (!isDuplicate) {
            existing.push(sample);
          }

          const maxSamples = 50;
          if (existing.length > maxSamples) {
            existing.splice(0, existing.length - maxSamples);
          }

          return existing;
        })();

        return {
          ...previous,
          consensusState,
          consensusHistory: history,
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