// The single source of truth. Every view (story map, table, roadmap) reads and
// writes these same records; a view is only a different projection of an Item.

export type Horizon = 'now' | 'next' | 'later';
export type Status = 'idea' | 'planned' | 'in-progress' | 'done';

export const HORIZONS: { id: Horizon; name: string; hint: string }[] = [
  { id: 'now', name: 'Now', hint: 'Committed and in flight' },
  { id: 'next', name: 'Next', hint: 'Shaped and coming up' },
  { id: 'later', name: 'Later', hint: 'Directional, still exploring' },
];

export const STATUSES: { id: Status; name: string }[] = [
  { id: 'idea', name: 'Idea' },
  { id: 'planned', name: 'Planned' },
  { id: 'in-progress', name: 'In progress' },
  { id: 'done', name: 'Done' },
];

/** An ordered, named bucket: a journey step, a release slice, or a theme. */
export interface Lane {
  id: string;
  name: string;
  color?: string;
}

export type LaneKind = 'activities' | 'releases' | 'themes';

export const LANE_FIELD = {
  activities: 'activityId',
  releases: 'releaseId',
  themes: 'themeId',
} as const satisfies Record<LaneKind, keyof Item>;

export const LANE_LABEL: Record<LaneKind, { plural: string; singular: string; help: string }> = {
  activities: {
    plural: 'Journey steps',
    singular: 'Step',
    help: 'Story map columns: the steps of the user journey, left to right.',
  },
  releases: {
    plural: 'Releases',
    singular: 'Release',
    help: 'Story map rows: slices you ship together, top to bottom.',
  },
  themes: {
    plural: 'Themes',
    singular: 'Theme',
    help: 'Roadmap rows: the outcomes or bets you invest in.',
  },
};

export interface Item {
  id: string;
  title: string;
  description: string;
  /** Story map column (journey step). */
  activityId: string | null;
  /** Story map row (release slice). null = backlog. */
  releaseId: string | null;
  /** Roadmap row. */
  themeId: string | null;
  /** Roadmap column. null = not on the roadmap yet. */
  horizon: Horizon | null;
  status: Status;
  owner: string;
  /** Opt-in: only these appear on the customer-facing roadmap. */
  customerVisible: boolean;
  /** Position within whatever cell the item sits in; higher = later. */
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** Fields that decide where an item sits in the story map or roadmap. */
export const PLACEMENT_FIELDS = ['activityId', 'releaseId', 'themeId', 'horizon'] as const;

export interface Workspace {
  version: 1;
  name: string;
  activities: Lane[];
  releases: Lane[];
  themes: Lane[];
  items: Item[];
}

export const THEME_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6', '#f97316'];

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function nextOrder(items: Item[]): number {
  return items.reduce((max, it) => Math.max(max, it.order), 0) + 1;
}

export function byOrder(a: Item, b: Item): number {
  return a.order - b.order;
}

export function createItem(fields: Partial<Item> & { title: string }, order: number): Item {
  const now = new Date().toISOString();
  return {
    id: newId(),
    description: '',
    activityId: null,
    releaseId: null,
    themeId: null,
    horizon: null,
    status: 'idea',
    owner: '',
    customerVisible: false,
    ...fields,
    order,
    createdAt: now,
    updatedAt: now,
  };
}

export function createLane(name: string, color?: string): Lane {
  return color ? { id: newId(), name, color } : { id: newId(), name };
}

export function laneById(lanes: Lane[], id: string | null): Lane | undefined {
  return id === null ? undefined : lanes.find((l) => l.id === id);
}

export function horizonName(h: Horizon | null): string {
  return HORIZONS.find((x) => x.id === h)?.name ?? '';
}

export function statusName(s: Status): string {
  return STATUSES.find((x) => x.id === s)?.name ?? s;
}

export function blankWorkspace(): Workspace {
  return {
    version: 1,
    name: 'Untitled journey',
    activities: ['Step 1', 'Step 2', 'Step 3'].map((n) => createLane(n)),
    releases: ['MVP', 'Release 2'].map((n) => createLane(n)),
    themes: ['Theme A', 'Theme B'].map((n, i) => createLane(n, THEME_COLORS[i])),
    items: [],
  };
}

export function seedWorkspace(): Workspace {
  const activities = ['Discover', 'Sign up', 'Set up workspace', 'Invite team', 'Get first value', 'Renew & expand'].map(
    (n) => createLane(n),
  );
  const releases = ['MVP', 'Release 2', 'Future'].map((n) => createLane(n));
  const themes = ['Activation', 'Collaboration', 'Retention', 'Platform'].map((n, i) => createLane(n, THEME_COLORS[i]));
  const [discover, signup, setup, invite, value, renew] = activities;
  const [mvp, r2, future] = releases;
  const [activation, collab, retention, platform] = themes;

  type Row = [string, Lane | null, Lane | null, Lane | null, Horizon | null, Status, boolean, string, string?];
  const rows: Row[] = [
    ['Landing page with pricing', discover, mvp, activation, 'now', 'done', true, 'Marketing'],
    ['Self-serve sign up with email', signup, mvp, activation, 'now', 'in-progress', true, 'Growth squad',
      'No credit card required. Verify email before workspace creation.'],
    ['Sign in with Google', signup, r2, activation, 'next', 'planned', true, 'Growth squad'],
    ['Workspace setup wizard', setup, mvp, activation, 'now', 'in-progress', true, 'Core squad',
      'Three steps: name, use case, invite (skippable).'],
    ['Import from CSV', setup, r2, platform, 'next', 'planned', true, 'Core squad'],
    ['Invite teammates by email', invite, r2, collab, 'next', 'planned', true, 'Collab squad'],
    ['Roles & permissions', invite, future, collab, 'later', 'idea', true, 'Collab squad'],
    ['Guided first project template', value, mvp, activation, 'now', 'planned', true, 'Core squad',
      'Pre-filled sample so new users see value in under five minutes.'],
    ['Comments & mentions', value, r2, collab, 'next', 'idea', true, 'Collab squad'],
    ['Usage insights dashboard', value, future, retention, 'later', 'idea', true, 'Data team'],
    ['In-app upgrade flow', renew, r2, retention, 'next', 'idea', true, 'Growth squad'],
    ['Renewal reminders', renew, future, retention, 'later', 'idea', false, 'Growth squad'],
    ['Comparison pages for SEO', discover, null, activation, null, 'idea', false, 'Marketing'],
    ['SOC 2 readiness', null, null, platform, 'later', 'idea', false, 'Platform team',
      'Internal prerequisite for enterprise deals.'],
    ['Audit log', null, null, platform, null, 'idea', false, 'Platform team'],
  ];

  const items = rows.map(([title, a, r, t, horizon, status, customerVisible, owner, description], i) =>
    createItem(
      {
        title,
        description: description ?? '',
        activityId: a?.id ?? null,
        releaseId: r?.id ?? null,
        themeId: t?.id ?? null,
        horizon,
        status,
        customerVisible,
        owner,
      },
      i + 1,
    ),
  );

  return { version: 1, name: 'Customer onboarding journey', activities, releases, themes, items };
}

// ---------- Import validation ----------

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseLanes(v: unknown, kind: LaneKind): Lane[] {
  if (!Array.isArray(v)) throw new Error(`Missing the "${kind}" list.`);
  return v.map((l, i) => {
    if (!isObj(l) || typeof l.id !== 'string' || typeof l.name !== 'string') {
      throw new Error(`Entry ${i + 1} in "${kind}" needs an id and a name.`);
    }
    return typeof l.color === 'string' ? { id: l.id, name: l.name, color: l.color } : { id: l.id, name: l.name };
  });
}

/** Validates and normalises untrusted JSON (imports, localStorage) into a Workspace. */
export function parseWorkspace(data: unknown): Workspace {
  if (!isObj(data)) throw new Error('This is not a Journey-view workspace file.');
  const activities = parseLanes(data.activities, 'activities');
  const releases = parseLanes(data.releases, 'releases');
  const themes = parseLanes(data.themes, 'themes');
  if (!Array.isArray(data.items)) throw new Error('Missing the "items" list.');

  const ref = (v: unknown, lanes: Lane[]) => (typeof v === 'string' && lanes.some((l) => l.id === v) ? v : null);
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const now = new Date().toISOString();

  const items: Item[] = data.items.map((raw, i) => {
    if (!isObj(raw) || typeof raw.id !== 'string' || typeof raw.title !== 'string') {
      throw new Error(`Item ${i + 1} needs an id and a title.`);
    }
    return {
      id: raw.id,
      title: raw.title,
      description: str(raw.description),
      activityId: ref(raw.activityId, activities),
      releaseId: ref(raw.releaseId, releases),
      themeId: ref(raw.themeId, themes),
      horizon: HORIZONS.some((h) => h.id === raw.horizon) ? (raw.horizon as Horizon) : null,
      status: STATUSES.some((s) => s.id === raw.status) ? (raw.status as Status) : 'idea',
      owner: str(raw.owner),
      customerVisible: raw.customerVisible === true,
      order: typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : i + 1,
      createdAt: str(raw.createdAt) || now,
      updatedAt: str(raw.updatedAt) || now,
    };
  });

  const name = typeof data.name === 'string' && data.name.trim() ? data.name : 'Untitled journey';
  return { version: 1, name, activities, releases, themes, items };
}
