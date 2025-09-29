import { useState } from 'react';
import { Header } from './Header';
import { NodeStatusCard } from './NodeStatusCard';
import { HealthAlertsCard } from './HealthAlertsCard';
import { ConsensusStateCard } from './ConsensusStateCard';
import { NetworkInfoCard } from './NetworkInfoCard';
import { MempoolCard } from './MempoolCard';
import { VersionInfoCard } from './VersionInfoCard';
import { useCometBFT } from '../hooks/useCometBFT';
import { useGovernance } from '../hooks/useGovernance';
import { GovernanceCard } from './GovernanceCard';
import { useWallet } from '../hooks/useWallet';

type DashboardTab = 'overview' | 'health' | 'network' | 'governance';

export function Dashboard() {
  const [nodeUrl, setNodeUrl] = useState('https://node.xian.org');
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const { data } = useCometBFT({
    nodeUrl,
    refreshInterval: 5000,
    autoRefresh: true,
    consensusRefreshInterval: 1000,
    enableConsensusRealtime: true
  });

  const wallet = useWallet();

  const validatorInfo = data.status?.result.validator_info;
  const votingPower = validatorInfo ? Number(validatorInfo.voting_power) : 0;
  const isValidator = Number.isFinite(votingPower) && votingPower > 0;

  const governance = useGovernance({
    nodeUrl,
    enabled: isValidator,
    pageSize: 5,
  });

  const handleNodeUrlChange = (url: string) => {
    setNodeUrl(url);
  };

  const tabConfig: { id: DashboardTab; label: string; description: string }[] = [
    {
      id: 'overview',
      label: 'Node overview',
      description: 'Current validator identity, peers and uptime',
    },
    {
      id: 'health',
      label: 'Health & consensus',
      description: 'Live heartbeat, block production and participation metrics',
    },
    {
      id: 'network',
      label: 'Network activity',
      description: 'Peer connectivity, throughput and mempool insights',
    },
    {
      id: 'governance',
      label: 'Version & governance',
      description: 'Release alignment and validator decision tracking',
    },
  ];

  return (
    <div className="dashboard-container">
      <Header
        onNodeUrlChange={handleNodeUrlChange}
        walletInfo={wallet.walletInfo}
        isConnectingWallet={wallet.isConnecting}
        onConnectWallet={wallet.connect}
        walletError={wallet.error}
        onClearWalletError={wallet.clearError}
      />

      <main className="dashboard-content">
        <div className="dashboard-tabs" role="tablist" aria-label="Dashboard sections">
          {tabConfig.map((tab) => {
            const isActive = activeTab === tab.id;
            const buttonId = `dashboard-tab-${tab.id}`;
            const panelId = `dashboard-panel-${tab.id}`;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                id={buttonId}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                className={`dashboard-tab${isActive ? ' dashboard-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="dashboard-tab__label">{tab.label}</span>
                <span className="dashboard-tab__description">{tab.description}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <section
            className="dashboard-section"
            role="tabpanel"
            id="dashboard-panel-overview"
            aria-labelledby="dashboard-tab-overview"
          >
            <div className="dashboard-section__header">
              <h2 className="dashboard-section__title">Node overview</h2>
              <p className="dashboard-section__subtitle">
                Current validator identity, peers and uptime
              </p>
            </div>
            <div className="dashboard-grid">
              <div className="dashboard-item">
                <NodeStatusCard data={data} />
              </div>
              <div className="dashboard-item">
                <VersionInfoCard data={data} />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'health' && (
          <section
            className="dashboard-section"
            role="tabpanel"
            id="dashboard-panel-health"
            aria-labelledby="dashboard-tab-health"
          >
            <div className="dashboard-section__header">
              <h2 className="dashboard-section__title">Health &amp; consensus</h2>
              <p className="dashboard-section__subtitle">
                Live heartbeat, block production and participation metrics
              </p>
            </div>
            <div className="dashboard-grid">
              <div className="dashboard-item">
                <HealthAlertsCard data={data} />
              </div>
              <div className="dashboard-item">
                <ConsensusStateCard data={data} />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'network' && (
          <section
            className="dashboard-section"
            role="tabpanel"
            id="dashboard-panel-network"
            aria-labelledby="dashboard-tab-network"
          >
            <div className="dashboard-section__header">
              <h2 className="dashboard-section__title">Network activity</h2>
              <p className="dashboard-section__subtitle">
                Peer connectivity, throughput and mempool insights
              </p>
            </div>
            <div className="dashboard-grid">
              <div className="dashboard-item">
                <NetworkInfoCard data={data} />
              </div>
              <div className="dashboard-item">
                <MempoolCard data={data} />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'governance' && (
          <section
            className="dashboard-section"
            role="tabpanel"
            id="dashboard-panel-governance"
            aria-labelledby="dashboard-tab-governance"
          >
            <div className="dashboard-section__header">
              <h2 className="dashboard-section__title">Version &amp; governance</h2>
              <p className="dashboard-section__subtitle">
                Release alignment and validator decision tracking
              </p>
            </div>
            <div className="dashboard-grid">
              <div className="dashboard-item dashboard-item--wide">
                <GovernanceCard
                  isValidator={isValidator}
                  governance={governance}
                  walletInfo={wallet.walletInfo}
                  isConnectingWallet={wallet.isConnecting}
                  onConnectWallet={wallet.connect}
                  walletError={wallet.error}
                  clearWalletError={wallet.clearError}
                />
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="dashboard-footer">
        <p>
          Xian Node Dashboard - Real-time monitoring for CometBFT 0.38.12 nodes
        </p>
        <p className="dashboard-footer__meta">
          Auto-refresh every 5 seconds • Built with React & TypeScript
        </p>
      </footer>
    </div>
  );
}