import { useMemo } from 'react';
import { Card } from './Card';
import { LoadingSpinner } from './LoadingSpinner';
import { DashboardData, ConsensusParticipationSample } from '../types/cometbft';

interface ConsensusParticipationCardProps {
  data: DashboardData;
}

interface TrendPoint {
  x: number;
  y: number;
}

const CHART_HEIGHT = 140;
const CHART_WIDTH = 340;

const clampRatio = (value: number) => Math.max(0, Math.min(1, value));

const buildLinePoints = (samples: ConsensusParticipationSample[], key: 'prevoteRatio' | 'precommitRatio'): string => {
  if (samples.length === 0) {
    return '';
  }

  const step = samples.length > 1 ? CHART_WIDTH / (samples.length - 1) : CHART_WIDTH;
  const points: TrendPoint[] = samples
    .map((sample, index) => {
      const ratio = sample[key];
      if (ratio === null || Number.isNaN(ratio)) {
        return null;
      }

      return {
        x: index * step,
        y: CHART_HEIGHT - clampRatio(ratio) * CHART_HEIGHT,
      };
    })
    .filter((point): point is TrendPoint => point !== null);

  if (points.length === 0) {
    return '';
  }

  return points.map((point) => `${point.x},${point.y}`).join(' ');
};

const buildTimeLabels = (samples: ConsensusParticipationSample[]): string[] => {
  if (samples.length === 0) {
    return [];
  }

  const labelCount = Math.min(4, samples.length);
  const step = samples.length > 1 ? Math.floor((samples.length - 1) / (labelCount - 1)) : 1;

  return Array.from({ length: labelCount }, (_, index) => {
    const sampleIndex = Math.min(samples.length - 1, index * step);
    const timestamp = samples[sampleIndex]?.timestamp;

    if (!timestamp) {
      return '';
    }

    const date = new Date(timestamp);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });
};

const formatPercentage = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }

  return `${(value * 100).toFixed(1)}%`;
};

export function ConsensusParticipationCard({ data }: ConsensusParticipationCardProps) {
  const samples = data.consensusHistory;

  const { prevoteLine, precommitLine, labels } = useMemo(() => ({
    prevoteLine: buildLinePoints(samples, 'prevoteRatio'),
    precommitLine: buildLinePoints(samples, 'precommitRatio'),
    labels: buildTimeLabels(samples),
  }), [samples]);

  const latestSample = useMemo(() => {
    for (let index = samples.length - 1; index >= 0; index -= 1) {
      const sample = samples[index];
      if (sample?.prevoteRatio !== null || sample?.precommitRatio !== null) {
        return sample;
      }
    }
    return null;
  }, [samples]);

  if (data.loading && samples.length === 0) {
    return (
      <Card title="Participation Trend">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <LoadingSpinner />
          <span style={{ color: 'var(--text-secondary)' }}>Gathering recent consensus samples…</span>
        </div>
      </Card>
    );
  }

  if (!prevoteLine && !precommitLine) {
    return (
      <Card title="Participation Trend">
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          Waiting for live consensus participation data.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
          Once the node reports prevote and precommit ratios this card will display the last 50 samples.
        </p>
      </Card>
    );
  }

  const heightText = latestSample?.height !== null && latestSample?.height !== undefined
    ? `Height ${latestSample.height?.toLocaleString?.() ?? latestSample.height}`
    : 'Height unknown';

  const roundText = latestSample?.round !== null && latestSample?.round !== undefined
    ? `Round ${latestSample.round}`
    : 'Round unknown';

  return (
    <Card title="Participation Trend">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Latest sample
            </span>
            <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
              {heightText} · {roundText}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '999px', background: 'var(--color-accent)' }} aria-hidden />
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                Prevotes {formatPercentage(latestSample?.prevoteRatio ?? null)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '999px', background: 'var(--text-warning)' }} aria-hidden />
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                Precommits {formatPercentage(latestSample?.precommitRatio ?? null)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', height: `${CHART_HEIGHT}px` }}>
          <svg
            role="img"
            aria-label="Prevote and precommit participation over recent samples"
            width="100%"
            height="100%"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            style={{ display: 'block' }}
          >
            <defs>
              <linearGradient id="precommitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(251, 191, 36, 0.35)" />
                <stop offset="100%" stopColor="rgba(251, 191, 36, 0.05)" />
              </linearGradient>
              <linearGradient id="prevoteFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(0, 212, 255, 0.35)" />
                <stop offset="100%" stopColor="rgba(0, 212, 255, 0.05)" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width={CHART_WIDTH} height={CHART_HEIGHT} fill="rgba(255, 255, 255, 0.04)" rx="12" />

            {[0.33, 0.66, 1].map((fraction) => (
              <line
                key={fraction}
                x1={0}
                x2={CHART_WIDTH}
                y1={CHART_HEIGHT - fraction * CHART_HEIGHT}
                y2={CHART_HEIGHT - fraction * CHART_HEIGHT}
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            ))}

            {precommitLine && (
              <polyline
                points={precommitLine}
                fill="none"
                stroke="var(--text-warning)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {prevoteLine && (
              <polyline
                points={prevoteLine}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
          </svg>
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
