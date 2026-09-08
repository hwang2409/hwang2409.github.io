'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import styles from '@/components/Shipping.module.css';
import { fetchGithubActivity, type GithubActivity, type GithubContributionDay } from '@/lib/github';

const RAMP = ['·', '░', '▒', '▓', '█'] as const;
const FALLBACK_RAMP = ['.', '-', '+', '#', '#'] as const;
const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const;
const WEEKDAY_LABELS = ['', 'mon', '', 'wed', '', 'fri', ''];

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
  seenMonths: Set<string>,
): string {
  const firstDate = parseDate(week[0]?.date ?? '');
  const monthStart = week.find((day) => isFirstMonthDay(day));
  const monthStartDate = parseDate(monthStart?.date ?? '');
  const labelDate = monthStartDate ?? firstDate;
  const month = labelDate?.getUTCMonth();
  const year = labelDate?.getUTCFullYear();
  if (month === undefined || year === undefined || (index !== 0 && monthStartDate === null)) {
    return '';
  }
  const monthKey = `${year}-${month}`;
  if (seenMonths.has(monthKey)) {
    return '';
  }
  seenMonths.add(monthKey);
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

function measureRamp(element: HTMLElement): { readonly ramp: Ramp; readonly width: number } {
  const styles = getComputedStyle(element);
  const probe = document.createElement('span');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.whiteSpace = 'pre';
  probe.style.font = styles.font;
  element.append(probe);

  const widths = RAMP.map((glyph) => {
    probe.textContent = glyph;
    return probe.getBoundingClientRect().width;
  });
  const firstWidth = widths[0] ?? 0;
  const ramp = firstWidth > 0 && widths.every(
    (candidate) => Math.abs(candidate - firstWidth) < 0.1,
  ) ? RAMP : FALLBACK_RAMP;
  const width = Math.max(...ramp.map((glyph) => {
    probe.textContent = glyph;
    return probe.getBoundingClientRect().width;
  }));
  probe.remove();
  return { ramp, width: Math.max(width, 1) };
}

function useVisibleWeeks(
  containerRef: RefObject<HTMLDivElement | null>,
  gridRef: RefObject<HTMLDivElement | null>,
  weekTotal: number,
): {
  readonly count: number;
  readonly ramp: Ramp;
  readonly cellWidth: number | null;
  readonly labelWidth: number | null;
} {
  const [visibleWeekCount, setVisibleWeekCount] = useState(Math.min(weekTotal, 1));
  const [ramp, setRamp] = useState<Ramp>(RAMP);
  const [cellWidth, setCellWidth] = useState<number | null>(null);
  const [labelWidth, setLabelWidth] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    const grid = gridRef.current;
    if (element === null || grid === null) {
      return undefined;
    }
    const targetGrid = grid;
    let active = true;

    function measure() {
      if (!active) {
        return;
      }
      const metrics = measureRamp(targetGrid);
      const gridWidth = targetGrid.getBoundingClientRect().width;
      const gutter = targetGrid.firstElementChild?.getBoundingClientRect().width ?? 0;
      const gap = parseFloat(getComputedStyle(targetGrid).columnGap) || 0;
      if (gridWidth <= 0 || gutter <= 0 || metrics.width <= 0) {
        return;
      }
      const availableWidth = gridWidth - gutter;
      const count = Math.max(
        1,
        Math.min(weekTotal, Math.floor((availableWidth + gap) / (metrics.width + gap))),
      );
      setRamp(metrics.ramp);
      setVisibleWeekCount(count);
      setCellWidth(metrics.width);
      setLabelWidth(gutter);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    document.fonts?.ready.then(measure);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [containerRef, gridRef, weekTotal]);

  return { count: visibleWeekCount, ramp, cellWidth, labelWidth };
}

function Calendar({ weeks }: { readonly weeks: readonly (readonly GithubContributionDay[])[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { count, ramp, cellWidth, labelWidth } = useVisibleWeeks(
    containerRef,
    gridRef,
    weeks.length,
  );
  const visibleWeeks = weeks.slice(-count);
  const seenMonths = new Set<string>();
  const labelTrack = labelWidth === null ? '2.5rem' : `${labelWidth}px`;
  const cellTrack = cellWidth === null ? '1ch' : `${cellWidth}px`;
  const gridTemplateColumns = `${labelTrack} repeat(${visibleWeeks.length}, ${cellTrack})`;

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
        ref={gridRef}
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

  if (state.kind === 'error' || (state.kind === 'ready' && state.activity.status === 'unavailable')) {
    return (
      <section className={styles.shipping} aria-labelledby="shipping-title">
        <div className={styles.header}>
          <h2 id="shipping-title">shipping</h2>
        </div>
        <p className={styles.empty}>not shipping.</p>
      </section>
    );
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
