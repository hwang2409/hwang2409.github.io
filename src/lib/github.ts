const DEFAULT_API_URL = 'https://hwang2409githubio-production.up.railway.app';
const LAB_API_URL = process.env.NEXT_PUBLIC_LAB_API_URL || DEFAULT_API_URL;

export type GithubActivityStatus = 'ok' | 'partial' | 'unavailable';

export type GithubContributionDay = {
  readonly date: string;
  readonly level: number;
  readonly count: number;
};

export type GithubLatestPush = {
  readonly repo: string;
  readonly message: string;
  readonly pushedAt: string;
};

export type GithubActivity = {
  readonly status: GithubActivityStatus;
  readonly totalContributions: number | null;
  readonly weeks: readonly (readonly GithubContributionDay[])[] | null;
  readonly latestPush: GithubLatestPush | null;
  readonly openPrs: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStatus(value: unknown): GithubActivityStatus {
  const status = readString(value);
  if (status === 'ok' || status === 'partial' || status === 'unavailable') {
    return status;
  }
  throw new Error('GitHub activity response had an unknown status');
}

function parseDay(value: unknown): GithubContributionDay {
  if (!isRecord(value)) {
    throw new Error('GitHub activity day was not an object');
  }

  const level = readNullableNumber(value.level);
  const count = readNullableNumber(value.count);
  if (level === null || count === null || !Number.isInteger(level) || level < 0 || level > 4) {
    throw new Error('GitHub activity day had invalid data');
  }

  return {
    date: readString(value.date),
    level,
    count,
  };
}

function parseWeeks(value: unknown): readonly (readonly GithubContributionDay[])[] | null {
  if (value === null) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw new Error('GitHub activity weeks were not an array');
  }
  return value.map((week) => {
    if (!Array.isArray(week)) {
      throw new Error('GitHub activity week was not an array');
    }
    return week.map(parseDay);
  });
}

function parseLatestPush(value: unknown): GithubLatestPush | null {
  if (value === null) {
    return null;
  }
  if (!isRecord(value)) {
    throw new Error('GitHub latest push was not an object');
  }
  return {
    repo: readString(value.repo),
    message: readString(value.message),
    pushedAt: readString(value.pushed_at),
  };
}

function parseGithubActivity(value: unknown): GithubActivity {
  if (!isRecord(value)) {
    throw new Error('GitHub activity response was not an object');
  }

  return {
    status: readStatus(value.status),
    totalContributions: readNullableNumber(value.total_contributions),
    weeks: parseWeeks(value.weeks),
    latestPush: parseLatestPush(value.latest_push),
    openPrs: readNullableNumber(value.open_prs),
  };
}

export async function fetchGithubActivity(): Promise<GithubActivity> {
  const response = await fetch(`${LAB_API_URL}/github/activity`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`GitHub activity returned ${response.status}`);
  }
  return parseGithubActivity(await response.json());
}
