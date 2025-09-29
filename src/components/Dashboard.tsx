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
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Header
        isLoading={isLoading}
        lastUpdated={data.health.lastUpdated}
        onRefresh={refresh}
        onNodeUrlChange={handleNodeUrlChange}
      />
      
      <main
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: 'var(--space-6)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 'var(--space-6)',
          alignItems: 'start',
          gridAutoFlow: 'dense'
        }}
      >
        <div style={{ gridColumn: '1 / -1' }}>
          <NodeStatusCard data={data} />
        </div>
        <HealthAlertsCard data={data} />
        <ConsensusStateCard data={data} />
        <NetworkInfoCard data={data} />
        <MempoolCard data={data} />
        <VersionInfoCard data={data} />
        <div style={{ gridColumn: '1 / -1' }}>
          <GovernanceCard isValidator={isValidator} governance={governance} />
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-primary)',
        padding: 'var(--space-4)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: 'var(--text-sm)',
        background: 'var(--bg-secondary)'
      }}>
        <p>
          Xian Node Dashboard - Real-time monitoring for CometBFT 0.38.12 nodes
        </p>
        <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
          Auto-refresh every 5 seconds • Built with React & TypeScript
        </p>
      </footer>
    </div>
  );
}