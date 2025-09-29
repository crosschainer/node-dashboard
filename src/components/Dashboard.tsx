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

export function Dashboard() {
  const [nodeUrl, setNodeUrl] = useState('https://node.xian.org');
  const { data, refresh, isLoading } = useCometBFT({
    nodeUrl,
    refreshInterval: 5000,
    autoRefresh: true,
    consensusRefreshInterval: 1000,
    enableConsensusRealtime: true
  });

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

  return (
    <div className="dashboard-container">
      <Header
        isLoading={isLoading}
        lastUpdated={data.health.lastUpdated}
        onRefresh={refresh}
        onNodeUrlChange={handleNodeUrlChange}
      />

      <main className="dashboard-content">
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h2 className="dashboard-section__title">Node overview</h2>
            <p className="dashboard-section__subtitle">
              Current validator identity, peers and uptime
            </p>
          </div>
          <div className="dashboard-grid dashboard-grid--single">
            <div className="dashboard-item">
              <NodeStatusCard data={data} />
            </div>
          </div>
        </section>

        <section className="dashboard-section">
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

        <section className="dashboard-section">
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

        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h2 className="dashboard-section__title">Version &amp; governance</h2>
            <p className="dashboard-section__subtitle">
              Release alignment and validator decision tracking
            </p>
          </div>
          <div className="dashboard-grid">
            <div className="dashboard-item">
              <VersionInfoCard data={data} />
            </div>
            <div className="dashboard-item dashboard-item--wide">
              <GovernanceCard isValidator={isValidator} governance={governance} />
            </div>
          </div>
        </section>
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