import { useMemo } from 'react';
import { Card } from './Card';
import { LoadingSpinner } from './LoadingSpinner';
import { DashboardData } from '../types/cometbft';

interface PeerConnectivityTrendCardProps {
  data: DashboardData;
}

const CHART_HEIGHT = 140;
const CHART_WIDTH = 340;

const formatCount = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  return value.toLocaleString();
};

const formatTimestamp = (timestamp: string | null) => {
  if (!timestamp) {
    return '';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export function PeerConnectivityTrendCard({ data }: PeerConnectivityTrendCardProps) {
  const samples = data.peerCountHistory;

  const { linePoints, maxPeers, labels } = useMemo(() => {
    if (samples.length === 0) {
      return { linePoints: '', maxPeers: 0, labels: [] as string[] };
    }

    const validValues = samples
      .map((sample) => (sample.totalPeers !== null && sample.totalPeers >= 0 ? sample.totalPeers : null))
      .filter((value): value is number => value !== null);

    const maxPeers = validValues.length > 0 ? Math.max(...validValues) : 0;

    const step = samples.length > 1 ? CHART_WIDTH / (samples.length - 1) : CHART_WIDTH;

    const points = samples
      .map((sample, index) => {
        const totalPeers = sample.totalPeers;
        if (totalPeers === null || !Number.isFinite(totalPeers) || maxPeers === 0) {
          return null;
        }

        const ratio = totalPeers / maxPeers;
        return {
          x: index * step,
          y: CHART_HEIGHT - ratio * CHART_HEIGHT,
        };
      })
      .filter((point): point is { x: number; y: number } => point !== null);

    const linePoints = points.length > 0
      ? points.map((point) => `${point.x},${point.y}`).join(' ')
      : '';

    const labelCount = Math.min(4, samples.length);
    const labelStep = samples.length > 1 && labelCount > 1
      ? Math.floor((samples.length - 1) / (labelCount - 1))
      : 1;

    const labels = Array.from({ length: labelCount }, (_, index) => {
      const sampleIndex = Math.min(samples.length - 1, index * labelStep);
      return formatTimestamp(samples[sampleIndex]?.timestamp ?? null);
    });

    return { linePoints, maxPeers, labels };
  }, [samples]);

  const latest = samples[samples.length - 1];
  const averagePeers = useMemo(() => {
    const valid = samples
      .map((sample) => (sample.totalPeers !== null && sample.totalPeers >= 0 ? sample.totalPeers : null))
      .filter((value): value is number => value !== null);

    if (valid.length === 0) {
      return null;
    }

    const sum = valid.reduce((total, value) => total + value, 0);
    return sum / valid.length;
  }, [samples]);

  if (data.loading && samples.length === 0) {
    return (
      <Card title="Peer connectivity trend">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <LoadingSpinner />
          <span style={{ color: 'var(--text-secondary)' }}>Gathering peer snapshots…</span>
        </div>
      </Card>
    );
  }

  if (!linePoints) {
    return (
      <Card title="Peer connectivity trend">
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Waiting for peer connectivity data.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
          Once the node reports its peer set this card will plot inbound and outbound totals over time.
        </p>
      </Card>
    );
  }

  const yTickCount = 4;
  const yTicks = maxPeers > 0
    ? Array.from({ length: yTickCount }, (_, index) => {
      const value = maxPeers - (maxPeers / (yTickCount - 1 || 1)) * index;
      const normalized = value / maxPeers;
      return {
        y: CHART_HEIGHT - normalized * CHART_HEIGHT,
        label: formatCount(Math.round(value)),
      };
    })
    : [];

  return (
    <Card title="Peer connectivity trend">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Current peers
            </span>
            <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
              {formatCount(latest?.totalPeers ?? null)}
              {' '}
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                ({formatCount(latest?.inboundPeers ?? null)} inbound · {formatCount(latest?.outboundPeers ?? null)} outbound)
              </span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Average peers
            </span>
            <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
              {formatCount(averagePeers)}
            </span>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', height: `${CHART_HEIGHT}px` }}>
          <svg
            role="img"
            aria-label="Peer connectivity trend"
            width="100%"
            height="100%"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            style={{ display: 'block' }}
          >
            <rect x="0" y="0" width={CHART_WIDTH} height={CHART_HEIGHT} fill="rgba(255, 255, 255, 0.04)" rx="12" />

            {yTicks.map((tick, index) => (
              <line
                key={index}
                x1={0}
                x2={CHART_WIDTH}
                y1={tick.y}
                y2={tick.y}
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            ))}

            <polyline
              points={linePoints}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>

          {yTicks.map((tick, index) => (
            <span
              key={`label-${index}`}
              style={{
                position: 'absolute',
                right: 'var(--space-2)',
                top: `${tick.y - 8}px`,
                color: 'var(--text-muted)',
                fontSize: 'var(--text-xs)',
              }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        {labels.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            {labels.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
