'use client';

import styles from '@/components/SpotifyStats.module.css';
import MusicCoverShelf, { type MusicCoverItem } from '@/components/MusicCoverShelf';
import { formatArtists } from '@/components/SpotifyTrackFeature';
import type {
  SpotifyInsightSection,
  SpotifyInsightTrack,
  SpotifyInsights,
  SpotifyTimeline,
} from '@/lib/spotify';

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function EmptyInsight({ children }: { readonly children: string }) {
  return <p className={styles.empty}>{children}</p>;
}

function insightCoverItem(
  track: SpotifyInsightTrack,
  mode: 'plays' | 'skips',
): MusicCoverItem {
  return {
    key: `${mode}-${track.rank}-${track.title}`,
    rank: track.rank,
    title: track.title,
    subtitle: formatArtists(track.artists),
    meta:
      mode === 'plays'
        ? `${track.plays} plays / ${percent(track.completionRate)} finished`
        : `${track.skips} skips / avg ${track.averageSkipPercent ?? 0}%`,
    imageUrl: track.imageUrl,
    url: track.url,
    fallback: String(track.rank),
  };
}

function InsightList({
  tracks,
  mode,
  variant,
  showMeta,
}: {
  readonly tracks: readonly SpotifyInsightTrack[];
  readonly mode: 'plays' | 'skips';
  readonly variant: 'wall' | 'compact';
  readonly showMeta: boolean;
}) {
  return (
    <MusicCoverShelf
      items={tracks.map((track) => insightCoverItem(track, mode))}
      empty={mode === 'plays' ? 'no local plays captured yet.' : 'no local skips captured yet.'}
      variant={variant}
      showMeta={showMeta}
    />
  );
}

function maxBucketValue(timeline: SpotifyTimeline): number {
  return Math.max(
    1,
    ...timeline.buckets.flatMap((bucket) => [bucket.listens, bucket.skips]),
  );
}

function Timeline({ timeline }: { readonly timeline: SpotifyTimeline | null }) {
  if (timeline === null) {
    return <EmptyInsight>no timeline samples yet.</EmptyInsight>;
  }

  const maxValue = maxBucketValue(timeline);

  return (
    <div className={styles.timelineBlock}>
      <div className={styles.timelineTitle}>
        <span>{timeline.title}</span>
        <span>{formatArtists(timeline.artists)}</span>
      </div>
      <div className={styles.timelineStrip} aria-label={`Listening timeline for ${timeline.title}`}>
        {timeline.buckets.map((bucket) => {
          const listenHeight = Math.max(8, Math.round((bucket.listens / maxValue) * 100));
          const skipHeight = Math.round((bucket.skips / maxValue) * 100);
          return (
            <span
              key={bucket.index}
              className={styles.timelineBucket}
              title={`${bucket.startPercent}-${bucket.endPercent}%: ${bucket.listens} listens, ${bucket.skips} skips`}
            >
              <span className={styles.listenBar} style={{ height: `${listenHeight}%` }} />
              {bucket.skips > 0 ? (
                <span className={styles.skipBar} style={{ height: `${Math.max(10, skipHeight)}%` }} />
              ) : null}
            </span>
          );
        })}
      </div>
      <div className={styles.timelineLegend}>
        <span>start</span>
        <span>skip marks stack over listen samples</span>
        <span>end</span>
      </div>
    </div>
  );
}

function MetricSection({ section }: { readonly section: SpotifyInsightSection }) {
  return (
    <section className={styles.metricSection} aria-labelledby={`metric-${section.title}`}>
      <div className={styles.header}>
        <h3 id={`metric-${section.title}`}>{section.title}</h3>
        <span>{section.eyebrow}</span>
      </div>
      <dl className={styles.metricGrid}>
        {section.metrics.map((metric) => (
          <div key={`${section.title}-${metric.label}`}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
            <p>{metric.note}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}

function LocalSummary({ insights }: { readonly insights: SpotifyInsights }) {
  return (
    <dl className={styles.statusGrid}>
      <div>
        <dt>samples</dt>
        <dd>{insights.observedSamples}</dd>
      </div>
      <div>
        <dt>plays</dt>
        <dd>{insights.totalPlays}</dd>
      </div>
      <div>
        <dt>active days</dt>
        <dd>{insights.activeDays}</dd>
      </div>
      <div>
        <dt>collector</dt>
        <dd>{insights.status === 'ok' ? 'recording' : 'paused'}</dd>
      </div>
    </dl>
  );
}

export function MusicLocalPanel({ insights }: { readonly insights: SpotifyInsights }) {
  return (
    <section className={`${styles.musicSection} ${styles.localPanel}`} aria-labelledby="music-local">
      <div className={styles.header}>
        <h2 id="music-local">local history</h2>
        <span>event store</span>
      </div>
      <LocalSummary insights={insights} />
      <p className={styles.note}>{insights.note}</p>
    </section>
  );
}

export function MusicRealCountsPanel({ insights }: { readonly insights: SpotifyInsights }) {
  return (
    <section className={`${styles.musicSection} ${styles.realCountsPanel}`} aria-labelledby="music-local-tracks">
      <div className={styles.header}>
        <h2 id="music-local-tracks">real counts</h2>
        <span>captured plays</span>
      </div>
      <InsightList tracks={insights.topPlayed} mode="plays" variant="wall" showMeta />
    </section>
  );
}

export function MusicSkipPanel({ insights }: { readonly insights: SpotifyInsights }) {
  return (
    <section className={`${styles.musicSection} ${styles.skipPanel}`} aria-labelledby="music-skip-profile">
      <div className={styles.header}>
        <h2 id="music-skip-profile">skip profile</h2>
        <span>completion</span>
      </div>
      <InsightList tracks={insights.skipProfile} mode="skips" variant="compact" showMeta />
    </section>
  );
}

export function MusicTimelinePanel({ insights }: { readonly insights: SpotifyInsights }) {
  return (
    <section className={`${styles.musicSection} ${styles.timelinePanel}`} aria-labelledby="music-timeline">
      <div className={styles.header}>
        <h2 id="music-timeline">song timeline</h2>
        <span>5% buckets</span>
      </div>
      <Timeline timeline={insights.timeline} />
    </section>
  );
}

export function MusicMetricSections({ insights }: { readonly insights: SpotifyInsights }) {
  return (
    <div className={styles.metricSections}>
      {insights.sections.map((section) => (
        <MetricSection key={section.title} section={section} />
      ))}
    </div>
  );
}
