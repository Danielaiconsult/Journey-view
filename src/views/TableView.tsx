import { useEffect, useMemo, useState } from 'react';
import {
  createItem,
  HORIZONS,
  Horizon,
  Item,
  Lane,
  laneById,
  horizonName,
  nextOrder,
  STATUSES,
  Status,
  statusName,
} from '../model';
import { ItemPatch } from '../reducer';
import { useOpenItem, useWorkspace } from '../store';
import { LaneSelect } from '../components/ItemDrawer';
import { download, slugify, toCsv } from '../files';
import { cx } from '../components/ui';

const ANY = '';
const NONE = '__none__';

type FilterKey = 'activityId' | 'releaseId' | 'themeId' | 'horizon' | 'status';
type Filters = Record<FilterKey, string>;
const NO_FILTERS: Filters = { activityId: ANY, releaseId: ANY, themeId: ANY, horizon: ANY, status: ANY };

type SortKey = 'title' | 'activity' | 'release' | 'theme' | 'horizon' | 'status' | 'owner' | 'customer' | 'updated';

function TextCell({
  value,
  onCommit,
  label,
  required,
  placeholder,
}: {
  value: string;
  onCommit: (v: string) => void;
  label: string;
  required?: boolean;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      className="cell-input"
      aria-label={label}
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (required && !v.trim()) setV(value);
        else if (v !== value) onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') setV(value);
      }}
    />
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  noneLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string }[];
  noneLabel: string;
}) {
  return (
    <label className={cx('filter', value !== ANY && 'filter-active')}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={ANY}>Any</option>
        <option value={NONE}>{noneLabel}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TableView() {
  const { ws, dispatch } = useWorkspace();
  const openItem = useOpenItem();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'activity', dir: 1 });

  const update = (id: string, patch: ItemPatch) => dispatch({ type: 'item/update', id, patch });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const laneRank = (lanes: Lane[], id: string | null) => (id === null ? Infinity : lanes.findIndex((l) => l.id === id));
    const rank: Record<SortKey, (i: Item) => number | string> = {
      title: (i) => i.title.toLowerCase(),
      activity: (i) => laneRank(ws.activities, i.activityId),
      release: (i) => laneRank(ws.releases, i.releaseId),
      theme: (i) => laneRank(ws.themes, i.themeId),
      horizon: (i) => (i.horizon === null ? Infinity : HORIZONS.findIndex((h) => h.id === i.horizon)),
      status: (i) => STATUSES.findIndex((s) => s.id === i.status),
      owner: (i) => i.owner.toLowerCase() || '￿',
      customer: (i) => (i.customerVisible ? 0 : 1),
      updated: (i) => i.updatedAt,
    };
    const key = rank[sort.key];
    return ws.items
      .filter((i) => !q || `${i.title} ${i.description} ${i.owner}`.toLowerCase().includes(q))
      .filter((i) =>
        (Object.keys(filters) as FilterKey[]).every((k) => {
          const f = filters[k];
          return f === ANY || (f === NONE ? i[k] === null : i[k] === f);
        }),
      )
      .sort((a, b) => {
        const ka = key(a);
        const kb = key(b);
        const c = ka < kb ? -1 : ka > kb ? 1 : 0;
        return c !== 0 ? c * sort.dir : a.order - b.order;
      });
  }, [ws, query, filters, sort]);

  const filtered = query !== '' || Object.values(filters).some((v) => v !== ANY);

  const addRow = () => {
    // New rows inherit the active filters so they stay visible.
    const inherit: Partial<Item> = {};
    for (const k of ['activityId', 'releaseId', 'themeId'] as const) {
      if (filters[k] !== ANY && filters[k] !== NONE) inherit[k] = filters[k];
    }
    if (filters.horizon !== ANY && filters.horizon !== NONE) inherit.horizon = filters.horizon as Horizon;
    if (filters.status !== ANY && filters.status !== NONE) inherit.status = filters.status as Status;
    const item = createItem({ ...inherit, title: 'New item' }, nextOrder(ws.items));
    dispatch({ type: 'item/add', item });
    openItem(item.id);
  };

  const exportCsv = () => {
    const header = ['Title', 'Description', 'Journey step', 'Release', 'Theme', 'Horizon', 'Status', 'Owner', 'Customer visible', 'Updated'];
    const body = rows.map((i) => [
      i.title,
      i.description,
      laneById(ws.activities, i.activityId)?.name ?? '',
      laneById(ws.releases, i.releaseId)?.name ?? '',
      laneById(ws.themes, i.themeId)?.name ?? '',
      horizonName(i.horizon),
      statusName(i.status),
      i.owner,
      i.customerVisible ? 'yes' : 'no',
      i.updatedAt,
    ]);
    download(`${slugify(ws.name)}.csv`, toCsv([header, ...body]), 'text/csv;charset=utf-8');
  };

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={className} aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
      <button
        className="th-sort"
        onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : 1 }))}
      >
        {children}
        <span className="sort-arrow">{sort.key === k ? (sort.dir === 1 ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );

  const setFilter = (k: FilterKey) => (v: string) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="view">
      <div className="view-bar">
        <div>
          <h2>Table</h2>
          <p className="muted small">Every item in one place. Edit any cell; the story map and roadmap update instantly.</p>
        </div>
        <div className="bar-actions">
          <button className="btn" onClick={exportCsv}>
            Export CSV
          </button>
          <button className="btn btn-primary" onClick={addRow}>
            + New item
          </button>
        </div>
      </div>

      <div className="filters">
        <label className="filter filter-search">
          <span>Search</span>
          <input type="search" placeholder="Title, description, owner" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <FilterSelect label="Journey step" value={filters.activityId} onChange={setFilter('activityId')} options={ws.activities} noneLabel="Unassigned" />
        <FilterSelect label="Release" value={filters.releaseId} onChange={setFilter('releaseId')} options={ws.releases} noneLabel="Backlog" />
        <FilterSelect label="Theme" value={filters.themeId} onChange={setFilter('themeId')} options={ws.themes} noneLabel="No theme" />
        <FilterSelect label="Horizon" value={filters.horizon} onChange={setFilter('horizon')} options={HORIZONS} noneLabel="Not on roadmap" />
        <FilterSelect label="Status" value={filters.status} onChange={setFilter('status')} options={STATUSES} noneLabel="—" />
        {filtered && (
          <button
            className="btn btn-ghost btn-small"
            onClick={() => {
              setQuery('');
              setFilters(NO_FILTERS);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="table-scroll">
        <table className="grid-table">
          <thead>
            <tr>
              <Th k="title" className="col-title">Title</Th>
              <Th k="activity">Journey step</Th>
              <Th k="release">Release</Th>
              <Th k="theme">Theme</Th>
              <Th k="horizon">Horizon</Th>
              <Th k="status">Status</Th>
              <Th k="owner">Owner</Th>
              <Th k="customer">Customer</Th>
              <Th k="updated">Updated</Th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td className="col-title">
                  <TextCell label="Title" value={i.title} required onCommit={(title) => update(i.id, { title })} />
                </td>
                <td>
                  <LaneSelect label="Journey step" lanes={ws.activities} value={i.activityId} empty="—" onChange={(activityId) => update(i.id, { activityId })} />
                </td>
                <td>
                  <LaneSelect label="Release" lanes={ws.releases} value={i.releaseId} empty="Backlog" onChange={(releaseId) => update(i.id, { releaseId })} />
                </td>
                <td>
                  <LaneSelect label="Theme" lanes={ws.themes} value={i.themeId} empty="—" onChange={(themeId) => update(i.id, { themeId })} />
                </td>
                <td>
                  <select aria-label="Horizon" value={i.horizon ?? ''} onChange={(e) => update(i.id, { horizon: (e.target.value || null) as Horizon | null })}>
                    <option value="">—</option>
                    {HORIZONS.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select aria-label="Status" className={`status-select status-${i.status}`} value={i.status} onChange={(e) => update(i.id, { status: e.target.value as Status })}>
                    {STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <TextCell label="Owner" value={i.owner} placeholder="—" onCommit={(owner) => update(i.id, { owner })} />
                </td>
                <td className="center">
                  <input
                    type="checkbox"
                    aria-label="Show on customer roadmap"
                    checked={i.customerVisible}
                    onChange={(e) => update(i.id, { customerVisible: e.target.checked })}
                  />
                </td>
                <td className="muted small nowrap">{new Date(i.updatedAt).toLocaleDateString()}</td>
                <td className="nowrap">
                  <button className="btn btn-ghost btn-icon" aria-label={`Open ${i.title}`} title="Open details" onClick={() => openItem(i.id)}>
                    ⤢
                  </button>
                  <button
                    className="btn btn-ghost btn-icon"
                    aria-label={`Delete ${i.title}`}
                    title="Delete"
                    onClick={() => confirm(`Delete "${i.title}"? It disappears from every view.`) && dispatch({ type: 'item/delete', id: i.id })}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted empty">No items match these filters.</p>}
      </div>
      <p className="muted small table-count">
        Showing {rows.length} of {ws.items.length} items
      </p>
    </div>
  );
}
