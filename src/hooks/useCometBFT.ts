import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardData } from '../types/cometbft';
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
      setData(newData);
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
        }
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