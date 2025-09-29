/* eslint-disable @typescript-eslint/no-explicit-any */
interface WalletInfo {
  address: string;
  truncatedAddress?: string;
  locked?: boolean;
  chainId?: string;
  [key: string]: unknown;
}

interface SignMessageResponse {
  [key: string]: unknown;
}

interface TransactionResult {
  txid?: string;
  errors?: unknown;
  [key: string]: unknown;
}

interface ResolversState<T> {
  requests: Array<(value: T) => void>;
}

interface WalletReadyState {
  isReady: boolean;
  resolvers: Array<() => void>;
}

interface WalletState {
  walletReady: WalletReadyState;
  walletInfo: ResolversState<WalletInfo>;
  signMessage: ResolversState<SignMessageResponse>;
  transaction: ResolversState<TransactionResult | null>;
}

function decodeBase64Json(encoded: string | null | undefined): unknown {
  if (!encoded) {
    return null;
  }
  const decoded = window.atob(encoded);
  try {
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('Failed to parse base64 JSON response', error);
    return decoded;
  }
}

function hexToString(hex: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return String.fromCharCode(...bytes);
}

const XianWalletUtils = {
  rpcUrl: 'https://testnet.xian.org',
  isWalletReady: false,
  initialized: false,
  state: {
    walletReady: {
      isReady: false,
      resolvers: [] as Array<() => void>,
    },
    walletInfo: {
      requests: [] as Array<(value: WalletInfo) => void>,
    },
    signMessage: {
      requests: [] as Array<(value: SignMessageResponse) => void>,
    },
    transaction: {
      requests: [] as Array<(value: TransactionResult | null) => void>,
    },
  } as WalletState,

  init(rpcUrl?: string) {
    if (this.initialized) {
      console.warn('XianWalletUtils is already initialized. Avoiding re-initialization.');
      return;
    }

    if (rpcUrl) {
      this.rpcUrl = rpcUrl;
    }

    document.addEventListener('xianWalletInfo', (event) => {
      if (this.state.walletInfo.requests.length > 0) {
        const resolver = this.state.walletInfo.requests.shift();
        if (resolver) {
          const detail = (event as CustomEvent<WalletInfo>).detail;
          resolver(detail);
        }
      }
    });

    document.addEventListener('xianWalletSignMsgResponse', (event) => {
      if (this.state.signMessage.requests.length > 0) {
        const resolver = this.state.signMessage.requests.shift();
        if (resolver) {
          const detail = (event as CustomEvent<SignMessageResponse>).detail;
          resolver(detail);
        }
      }
    });

    document.addEventListener('xianWalletTxStatus', (event) => {
      if (this.state.transaction.requests.length > 0) {
        const resolver = this.state.transaction.requests.shift();
        if (resolver) {
          const detail = (event as CustomEvent<TransactionResult>).detail;
          if (detail && 'errors' in detail) {
            resolver(detail);
          } else if (detail?.txid) {
            this.getTxResultsAsyncBackoff(detail.txid)
              .then((tx) => {
                const data = tx.result?.tx_result?.data;
                const originalTx = tx.result?.tx;
                const parsedData = decodeBase64Json(data) as Record<string, unknown> | null;
                const decodedOriginalTx = decodeBase64Json(originalTx);

                if (parsedData && decodedOriginalTx && typeof decodedOriginalTx === 'string') {
                  try {
                    parsedData.original_tx = JSON.parse(hexToString(decodedOriginalTx));
                  } catch (error) {
                    console.warn('Failed to parse original transaction payload', error);
                  }
                }

                resolver(parsedData as TransactionResult | null);
              })
              .catch((error) => {
                console.error('Final error after retries:', error);
                resolver(null);
              });
          } else {
            resolver(detail ?? null);
          }
        }
      }
    });

    document.addEventListener('xianReady', () => {
      this.isWalletReady = true;
      while (this.state.walletReady.resolvers.length > 0) {
        const resolver = this.state.walletReady.resolvers.shift();
        if (resolver) {
          resolver();
        }
      }
      console.log('Xian Wallet is ready');
    });

    this.initialized = true;
  },

  waitForWalletReady() {
    return new Promise<void>((resolve) => {
      if (this.isWalletReady) {
        resolve();
        return;
      }

      this.state.walletReady.resolvers.push(resolve);

      setTimeout(() => {
        if (!this.isWalletReady) {
          const index = this.state.walletReady.resolvers.indexOf(resolve);
          if (index !== -1) {
            this.state.walletReady.resolvers.splice(index, 1);
          }
          resolve();
        }
      }, 2000);
    });
  },

  async requestWalletInfo() {
    await this.waitForWalletReady();
    return new Promise<WalletInfo>((resolve, reject) => {
      const wrappedResolver = (detail: WalletInfo) => {
        clearTimeout(timeoutId);
        resolve(detail);
      };

      const timeoutId = window.setTimeout(() => {
        const index = this.state.walletInfo.requests.indexOf(wrappedResolver);
        if (index !== -1) {
          this.state.walletInfo.requests.splice(index, 1);
        }
        reject(new Error('Xian Wallet Chrome extension not installed or not responding'));
      }, 2000);

      this.state.walletInfo.requests.push(wrappedResolver);
      document.dispatchEvent(new CustomEvent('xianWalletGetInfo'));
    });
  },

  async signMessage(message: string) {
    await this.waitForWalletReady();
    return new Promise<SignMessageResponse>((resolve, reject) => {
      const wrappedResolver = (detail: SignMessageResponse) => {
        clearTimeout(timeoutId);
        resolve(detail);
      };

      const timeoutId = window.setTimeout(() => {
        const index = this.state.signMessage.requests.indexOf(wrappedResolver);
        if (index !== -1) {
          this.state.signMessage.requests.splice(index, 1);
        }
        reject(new Error('Xian Wallet Chrome extension not responding'));
      }, 30000);

      this.state.signMessage.requests.push(wrappedResolver);
      document.dispatchEvent(new CustomEvent('xianWalletSignMsg', {
        detail: {
          message,
        },
      }));
    });
  },

  async sendTransaction(contract: string, method: string, kwargs: Record<string, unknown>) {
    await this.waitForWalletReady();
    return new Promise<TransactionResult | null>((resolve, reject) => {
      const wrappedResolver = (detail: TransactionResult | null) => {
        clearTimeout(timeoutId);
        resolve(detail);
      };

      const timeoutId = window.setTimeout(() => {
        const index = this.state.transaction.requests.indexOf(wrappedResolver);
        if (index !== -1) {
          this.state.transaction.requests.splice(index, 1);
        }
        reject(new Error('Xian Wallet Chrome extension not responding'));
      }, 30000);

      this.state.transaction.requests.push(wrappedResolver);
      document.dispatchEvent(new CustomEvent('xianWalletSendTx', {
        detail: {
          contract,
          method,
          kwargs,
        },
      }));
    });
  },

  async getTxResults(txHash: string) {
    const response = await fetch(`${this.rpcUrl}/tx?hash=0x${txHash}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  },

  async getBalanceRequest(address: string, contract: string) {
    const response = await fetch(`${this.rpcUrl}/abci_query?path=%22/get/${contract}.balances:${address}%22`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    const balance = data.result?.response?.value;
    if (balance === 'AA==') {
      return 0;
    }
    return window.atob(balance);
  },

  async getBalance(contract: string) {
    const info = await this.requestWalletInfo();
    const address = info.address;
    return this.getBalanceRequest(address, contract);
  },

  async getApprovedBalanceRequest(tokenContract: string, address: string, approvedTo: string) {
    const response = await fetch(`${this.rpcUrl}/abci_query?path=%22/get/${tokenContract}.balances:${address}:${approvedTo}%22`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    const balance = data.result?.response?.value;
    if (balance === 'AA==') {
      return 0;
    }
    return window.atob(balance);
  },

  async getApprovedBalance(tokenContract: string, approvedTo: string) {
    const info = await this.requestWalletInfo();
    const address = info.address;
    return this.getApprovedBalanceRequest(tokenContract, address, approvedTo);
  },

  async getTxResultsAsyncBackoff(txHash: string, retries = 5, delay = 1000): Promise<any> {
    try {
      return await this.getTxResults(txHash);
    } catch (error) {
      if (retries === 0) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.getTxResultsAsyncBackoff(txHash, retries - 1, delay * 2);
    }
  },
};

export default XianWalletUtils;
