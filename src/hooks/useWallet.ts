import { useCallback, useState } from 'react';
import XianWalletUtils from '../services/xianWalletUtils';

export interface ConnectedWalletInfo {
  address: string;
  truncatedAddress?: string;
  locked?: boolean;
  chainId?: string;
}

interface UseWalletResult {
  walletInfo: ConnectedWalletInfo | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  clearError: () => void;
}

export function useWallet(): UseWalletResult {
  const [walletInfo, setWalletInfo] = useState<ConnectedWalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const info = await XianWalletUtils.requestWalletInfo();
      setWalletInfo(info);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setWalletInfo(null);
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    walletInfo,
    isConnecting,
    error,
    connect,
    clearError,
  };
}
