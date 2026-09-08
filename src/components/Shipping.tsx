'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '@/components/Shipping.module.css';
import { fetchGithubActivity, type GithubActivity, type GithubContributionDay } from '@/lib/github';

const RAMP = ['·', '░', '▒', '▓', '█'] as const;
const FALLBACK_RAMP = ['.', '-', '+', '#', '#'] as const;
const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const;
const WEEKDAY_LABELS = ['', 'mon', '', 'wed', '', 'fri', ''];
const GRID_GUTTER_REM = 2.5;

type Ramp = readonly string[];
type ShippingState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly activity: GithubActivity }
  | { readonly kind: 'error' };

function assertNever(value: never): never {
  throw new Error(`Unexpected shipping state: ${JSON.stringify(value)}`);
}

function parseDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isFirstMonthDay(day: GithubContributionDay): boolean {
  return day.date.slice(8, 10) === '01';
}

function monthLabel(
  week: readonly GithubContributionDay[],
  index: number,
  seenMonths: Set<number>,
): string {
  const firstDate = parseDate(week[0]?.date ?? '');
  const monthStart = week.find((day) => isFirstMonthDay(day));
  const monthStartDate = parseDate(monthStart?.date ?? '');
  const month = monthStartDate?.getUTCMonth() ?? firstDate?.getUTCMonth();
  if (month === undefined || seenMonths.has(month) || (index !== 0 && monthStartDate === null)) {
    return '';
  }
  seenMonths.add(month);
  return MONTHS[month];
}

function dayForRow(
  week: readonly GithubContributionDay[],
  row: number,
): GithubContributionDay | undefined {
  return week.find((day) => parseDate(day.date)?.getUTCDay() === row);
}

function relativeTime(value: string): string {
  const pushedAt = Date.parse(value);
  if (!Number.isFinite(pushedAt)) {
    return 'recently';
  }
  const seconds = Math.max(0, Math.floor((Date.now() - pushedAt) / 1_000));
  if (seconds < 60) {
    return 'just now';
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function measureRamp(element: HTMLElement): Ramp {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (context === null) {
    return RAMP;
  }
  const styles = getComputedStyle(element);
  context.font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
  const widths = RAMP.map((glyph) => context.measureText(glyph).width);
  const width = widths[0];
  if (width !== undefined && widths.every((candidate) => Math.abs(candidate - width) < 0.1)) {
    return RAMP;
  }
  return FALLBACK_RAMP;
}

function useVisibleWeeks(
  containerRef: React.RefObject<HTMLDivElement | null>,
  weekTotal: number,
): { readonly count: number; readonly ramp: Ramp } {
  const [visibleWeekCount, setVisibleWeekCount] = useState(weekTotal);
  const [ramp, setRamp] = useState<Ramp>(RAMP);

  useEffect(() => {
    const element = containerRef.current;
    if (element === null) {
      return undefined;
    }
    const target = element;
    let active = true;

    function measure() {
      if (!active) {
        return;
      }
      const nextRamp = measureRamp(target);
      const fontSize = parseFloat(getComputedStyle(target).fontSize) || 15;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context === null) {
        return;
      }
      const styles = getComputedStyle(target);
      context.font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
      const cellWidth = Math.max(...nextRamp.map((glyph) => context.measureText(glyph).width));
      const gap = fontSize * 0.35;
      const availableWidth = target.getBoundingClientRect().width - fontSize * GRID_GUTTER_REM;
      const count = Math.max(
        1,
        Math.min(weekTotal, Math.floor((availableWidth + gap) / (cellWidth + gap))),
      );
      setRamp(nextRamp);
      setVisibleWeekCount(count);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(target);
    measure();
    document.fonts?.ready.then(measure);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [containerRef, weekTotal]);

  return { count: visibleWeekCount, ramp };
}

function Calendar({ weeks }: { readonly weeks: readonly (readonly GithubContributionDay[])[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { count, ramp } = useVisibleWeeks(containerRef, weeks.length);
  const visibleWeeks = weeks.slice(-count);
  const seenMonths = new Set<number>();
  const gridTemplateColumns = `2.5rem repeat(${visibleWeeks.length}, 1ch)`;

  return (
    <div className={styles.calendar} ref={containerRef}>
      <div
        className={styles.months}
        style={{ gridTemplateColumns }}
        aria-hidden="true"
      >
        <span />
        {visibleWeeks.map((week, index) => (
          <span className={styles.month} key={week[0]?.date ?? index}>
            {monthLabel(week, index, seenMonths)}
          </span>
        ))}
      </div>
      <div
        className={styles.grid}
        style={{ gridTemplateColumns }}
        aria-hidden="true"
      >
        <div className={styles.weekdays}>
          {WEEKDAY_LABELS.map((label, index) => <span key={index}>{label}</span>)}
        </div>
        {visibleWeeks.map((week, index) => (
          <div className={styles.week} key={week[0]?.date ?? index}>
            {Array.from({ length: 7 }, (_, row) => {
              const day = dayForRow(week, row);
              return (
                <span className={styles.cell} key={day?.date ?? row}>
                  {day ? ramp[day.level] : ''}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Shipping() {
  const [state, setState] = useState<ShippingState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchGithubActivity()
      .then((activity) => {
        if (!cancelled) {
          setState({ kind: 'ready', activity });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ kind: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (
    state.kind === 'error'
    || (state.kind === 'ready' && state.activity.status === 'unavailable')
  ) {
    return null;
  }
  if (state.kind === 'loading') {
    return (
      <section className={styles.shipping} aria-labelledby="shipping-title">
        <div className={styles.header}>
          <h2 id="shipping-title">shipping</h2>
          <span>checking github.</span>
        </div>
      </section>
    );
  }
  if (state.kind !== 'ready') {
    return assertNever(state);
  }
  const { activity } = state;

  const countLabel = activity.totalContributions === null
    ? 'contributions unavailable'
    : `${activity.totalContributions.toLocaleString()} contributions in the last year`;

  return (
    <section className={styles.shipping} aria-labelledby="shipping-title">
      <div className={styles.header}>
        <h2 id="shipping-title">shipping</h2>
        <span>{countLabel}</span>
      </div>
      {activity.weeks === null ? null : <Calendar weeks={activity.weeks} />}
      {activity.latestPush === null ? null : (
        <div className={styles.activityLines}>
          <p>last push: {activity.latestPush.message}</p>
          <p>{activity.latestPush.repo} · {relativeTime(activity.latestPush.pushedAt)}</p>
        </div>
      )}
      {activity.openPrs === null ? null : (
        <p className={styles.meta}>{activity.openPrs} PRs open</p>
      )}
    </section>
  );
}
