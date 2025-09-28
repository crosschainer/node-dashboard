import { useState } from 'react';
import { Header } from './Header';
import { NodeStatusCard } from './NodeStatusCard';
import { VersionInfoCard } from './VersionInfoCard';
import { NetworkInfoCard } from './NetworkInfoCard';
import { HealthAlertsCard } from './HealthAlertsCard';
import { useCometBFT } from '../hooks/useCometBFT';

export function Dashboard() {
  const [nodeUrl, setNodeUrl] = useState('https://node.xian.org');
  const { data, refresh, isLoading } = useCometBFT({ 
    nodeUrl,
    refreshInterval: 30000,
    autoRefresh: true 
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
      
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: 'var(--space-6)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 'var(--space-6)',
        alignItems: 'start'
      }}>
        {/* Primary Status Cards */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 'var(--space-6)' 
        }}>
          <NodeStatusCard data={data} />
          <HealthAlertsCard data={data} />
        </div>

        {/* Secondary Information Cards */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 'var(--space-6)' 
        }}>
          <VersionInfoCard data={data} />
          <NetworkInfoCard data={data} />
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
          CometBFT Node Dashboard - Real-time monitoring for CometBFT 0.38.12 nodes
        </p>
        <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
          Auto-refresh every 30 seconds • Built with React & TypeScript
        </p>
      </footer>
    </div>
  );
}