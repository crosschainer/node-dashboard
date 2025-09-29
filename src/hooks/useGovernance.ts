import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cometbftService } from '../services/cometbft';
import { GovernanceProposal } from '../types/cometbft';

interface UseGovernanceOptions {
  nodeUrl?: string;
  enabled?: boolean;
  pageSize?: number;
}

interface GovernanceState {
  totalProposals: number | null;
  proposals: GovernanceProposal[];
  page: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
}

export interface GovernanceHookResult extends GovernanceState {
  totalPages: number;
  goToPage: (page: number) => void;
  refresh: () => void;
}

const defaultState: GovernanceState = {
  totalProposals: null,
  proposals: [],
  page: 1,
  pageSize: 5,
  isLoading: false,
  error: null,
};

export function useGovernance({
  nodeUrl,
  enabled = true,
  pageSize = 5,
}: UseGovernanceOptions = {}): GovernanceHookResult {
  const stateRef = useRef<GovernanceState>({ ...defaultState, pageSize });
  const requestIdRef = useRef(0);
  const totalRef = useRef<number | null>(null);
  const [state, setState] = useState<GovernanceState>({ ...defaultState, pageSize });

  const setGovernanceState = useCallback((update: GovernanceState | ((prev: GovernanceState) => GovernanceState)) => {
    setState((prev) => {
      const nextState = typeof update === 'function' ? (update as (value: GovernanceState) => GovernanceState)(prev) : update;
      stateRef.current = nextState;
      return nextState;
    });
  }, []);

  const loadPage = useCallback(async (requestedPage: number, { forceReloadTotal = false } = {}) => {
    if (!enabled) {
      return;
    }

    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;

    setGovernanceState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      if (nodeUrl) {
        cometbftService.setBaseUrl(nodeUrl);
      }

      if (forceReloadTotal) {
        totalRef.current = null;
      }

      let total = totalRef.current;
      if (total === null) {
        total = await cometbftService.getGovernanceTotalProposals();
        totalRef.current = total;
      }

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      if (!total || total <= 0) {
        setGovernanceState({
          totalProposals: 0,
          proposals: [],
          page: 1,
          pageSize,
          isLoading: false,
          error: null,
        });
        return;
      }

      const maxPage = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(Math.max(1, requestedPage), maxPage);
      const startId = (safePage - 1) * pageSize + 1;
      const endId = Math.min(total, startId + pageSize - 1);
      const proposals = await cometbftService.getGovernanceProposalsRange(startId, endId);

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      setGovernanceState({
        totalProposals: total,
        proposals,
        page: safePage,
        pageSize,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Failed to load governance proposals';
      setGovernanceState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [enabled, nodeUrl, pageSize, setGovernanceState]);

  const goToPage = useCallback((page: number) => {
    if (!enabled) {
      return;
    }
    loadPage(page);
  }, [enabled, loadPage]);

  const refresh = useCallback(() => {
    if (!enabled) {
      return;
    }
    const currentPage = stateRef.current.page || 1;
    loadPage(currentPage, { forceReloadTotal: true });
  }, [enabled, loadPage]);

  useEffect(() => {
    totalRef.current = null;
    requestIdRef.current += 1;

    if (!enabled) {
      setGovernanceState({
        totalProposals: null,
        proposals: [],
        page: 1,
        pageSize,
        isLoading: false,
        error: null,
      });
      return;
    }

    setGovernanceState({
      totalProposals: null,
      proposals: [],
      page: 1,
      pageSize,
      isLoading: true,
      error: null,
    });

    loadPage(1);
  }, [enabled, nodeUrl, pageSize, loadPage, setGovernanceState]);

  useEffect(() => () => {
    requestIdRef.current += 1;
  }, []);

  const totalPages = useMemo(() => {
    if (!state.totalProposals || state.totalProposals <= 0) {
      return 0;
    }
    return Math.max(1, Math.ceil(state.totalProposals / state.pageSize));
  }, [state.totalProposals, state.pageSize]);

  return {
    ...state,
    totalPages,
    goToPage,
    refresh,
  };
}
