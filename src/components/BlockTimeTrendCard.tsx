import { useMemo } from 'react';
import { Card } from './Card';
import { LoadingSpinner } from './LoadingSpinner';
import { DashboardData } from '../types/cometbft';

interface BlockTimeTrendCardProps {
  data: DashboardData;
}

const CHART_HEIGHT = 140;
const CHART_WIDTH = 340;

const formatDuration = (milliseconds: number | null) => {
  if (milliseconds === null || Number.isNaN(milliseconds)) {
    return '—';
  }

  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }

  const seconds = milliseconds / 1000;
  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
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

export function BlockTimeTrendCard({ data }: BlockTimeTrendCardProps) {
  const samples = data.blockTimeHistory;

  const { linePoints, maxInterval, labels } = useMemo(() => {
    if (samples.length === 0) {
      return { linePoints: '', maxInterval: 0, labels: [] as string[] };
    }

    const validValues = samples
      .map((sample) => (sample.blockIntervalMs !== null && sample.blockIntervalMs > 0
        ? sample.blockIntervalMs
        : null))
      .filter((value): value is number => value !== null);

    const maxInterval = validValues.length > 0
      ? Math.max(...validValues)
      : 0;

    const step = samples.length > 1 ? CHART_WIDTH / (samples.length - 1) : CHART_WIDTH;

    const points = samples
      .map((sample, index) => {
        const interval = sample.blockIntervalMs;
        if (interval === null || !Number.isFinite(interval) || interval <= 0 || maxInterval === 0) {
          return null;
        }

        const ratio = interval / maxInterval;
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
      return formatTimestamp(samples[sampleIndex]?.blockTimestamp ?? samples[sampleIndex]?.timestamp ?? null);
    });

    return { linePoints, maxInterval, labels };
  }, [samples]);

  const latest = samples[samples.length - 1];
  const latestInterval = latest?.blockIntervalMs ?? null;
  const averageInterval = useMemo(() => {
    const valid = samples
      .map((sample) => (sample.blockIntervalMs !== null && sample.blockIntervalMs > 0
        ? sample.blockIntervalMs
        : null))
      .filter((value): value is number => value !== null);

    if (valid.length === 0) {
      return null;
    }

    const sum = valid.reduce((total, value) => total + value, 0);
    return sum / valid.length;
  }, [samples]);

  if (data.loading && samples.length === 0) {
    return (
      <Card title="Block production pace">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <LoadingSpinner />
          <span style={{ color: 'var(--text-secondary)' }}>Waiting for block timestamps…</span>
        </div>
      </Card>
    );
  }

  if (!linePoints) {
    return (
      <Card title="Block production pace">
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Waiting for multiple block time samples.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
          Once successive blocks are observed this card will display the interval between them.
        </p>
      </Card>
    );
  }

  const yTickCount = 4;
  const yTicks = maxInterval > 0
    ? Array.from({ length: yTickCount }, (_, index) => {
      const value = maxInterval - (maxInterval / (yTickCount - 1 || 1)) * index;
      const normalized = value / maxInterval;
      return {
        y: CHART_HEIGHT - normalized * CHART_HEIGHT,
        label: formatDuration(value),
      };
    })
    : [];

  return (
    <Card title="Block production pace">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Latest block interval
            </span>
            <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
              {formatDuration(latestInterval)}
              {latest?.blockHeight !== null && (
                <>
                  {' '}
                  <span style={{ color: 'var(--text-muted)' }}>@ height {latest.blockHeight.toLocaleString?.() ?? latest.blockHeight}</span>
                </>
              )}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Average interval
            </span>
            <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
              {formatDuration(averageInterval)}
            </span>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', height: `${CHART_HEIGHT}px` }}>
          <svg
            role="img"
            aria-label="Block interval trend"
            width="100%"
            height="100%"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            style={{ display: 'block' }}
          >
            <rect x="0" y="0" width={CHART_WIDTH} height={CHART_HEIGHT} fill="rgba(255, 255, 255, 0.04)" rx="12" />

            {yTicks.map((tick, index) => (
              <g key={index}>
                <line
                  x1={0}
                  x2={CHART_WIDTH}
                  y1={tick.y}
                  y2={tick.y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              </g>
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
