import { useEffect } from 'react';
import { HORIZONS, Horizon, Item, Lane, laneById, horizonName, STATUSES, Status } from '../model';
import { ItemPatch } from '../reducer';
import { useWorkspace } from '../store';

export function LaneSelect({
  lanes,
  value,
  onChange,
  empty,
  label,
}: {
  lanes: Lane[];
  value: string | null;
  onChange: (id: string | null) => void;
  empty: string;
  label: string;
}) {
  return (
    <select aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{empty}</option>
      {lanes.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </select>
  );
}

export function ItemDrawer({ item, onClose }: { item: Item; onClose: () => void }) {
  const { ws, dispatch } = useWorkspace();
  const update = (patch: ItemPatch) => dispatch({ type: 'item/update', id: item.id, patch });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activity = laneById(ws.activities, item.activityId);
  const release = laneById(ws.releases, item.releaseId);
  const theme = laneById(ws.themes, item.themeId);

  return (
    <aside className="drawer" aria-label="Item details">
      <div className="drawer-head">
        <span className="eyebrow">Item</span>
        <button className="btn btn-ghost" onClick={onClose} aria-label="Close details">
          ✕
        </button>
      </div>

      <label className="field">
        <span>Title</span>
        <input
          autoFocus
          value={item.title}
          onChange={(e) => update({ title: e.target.value })}
          onBlur={(e) => !e.target.value.trim() && update({ title: 'Untitled' })}
        />
      </label>

      <label className="field">
        <span>Description</span>
        <textarea rows={4} value={item.description} onChange={(e) => update({ description: e.target.value })} />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Journey step</span>
          <LaneSelect
            label="Journey step"
            lanes={ws.activities}
            value={item.activityId}
            empty="Unassigned"
            onChange={(activityId) => update({ activityId })}
          />
        </label>
        <label className="field">
          <span>Release</span>
          <LaneSelect
            label="Release"
            lanes={ws.releases}
            value={item.releaseId}
            empty="Backlog"
            onChange={(releaseId) => update({ releaseId })}
          />
        </label>
        <label className="field">
          <span>Theme</span>
          <LaneSelect
            label="Theme"
            lanes={ws.themes}
            value={item.themeId}
            empty="No theme"
            onChange={(themeId) => update({ themeId })}
          />
        </label>
        <label className="field">
          <span>Horizon</span>
          <select
            value={item.horizon ?? ''}
            onChange={(e) => update({ horizon: (e.target.value || null) as Horizon | null })}
          >
            <option value="">Not on roadmap</option>
            {HORIZONS.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select value={item.status} onChange={(e) => update({ status: e.target.value as Status })}>
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Owner</span>
          <input value={item.owner} onChange={(e) => update({ owner: e.target.value })} />
        </label>
      </div>

      <label className="field-check">
        <input
          type="checkbox"
          checked={item.customerVisible}
          onChange={(e) => update({ customerVisible: e.target.checked })}
        />
        <span>Show on the customer roadmap</span>
      </label>

      <section className="appears-in">
        <h3>Where this appears</h3>
        <dl>
          <dt>Story map</dt>
          <dd>
            {activity?.name ?? 'Unassigned step'} · {release?.name ?? 'Backlog'}
          </dd>
          <dt>Roadmap</dt>
          <dd>{item.horizon ? `${theme?.name ?? 'Other'} · ${horizonName(item.horizon)}` : 'Not scheduled'}</dd>
          <dt>Customer roadmap</dt>
          <dd>{item.customerVisible && item.horizon ? 'Shown' : 'Hidden'}</dd>
        </dl>
      </section>

      <div className="drawer-foot">
        <span className="muted small">Updated {new Date(item.updatedAt).toLocaleString()}</span>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (confirm(`Delete "${item.title}"? It disappears from every view.`)) {
              dispatch({ type: 'item/delete', id: item.id });
              onClose();
            }
          }}
        >
          Delete
        </button>
      </div>
    </aside>
  );
}
