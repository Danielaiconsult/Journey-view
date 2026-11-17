import { useState } from 'react';
import { byOrder, createLane, Item } from '../model';
import { useWorkspace } from '../store';
import { AddInline, Card, cx, DropCell, InlineEdit, QuickAdd } from '../components/ui';

interface Axis {
  id: string | null;
  name: string;
}

export function StoryMap() {
  const { ws, dispatch } = useWorkspace();
  const [showGaps, setShowGaps] = useState(true);

  const cell = (activityId: string | null, releaseId: string | null): Item[] =>
    ws.items.filter((i) => i.activityId === activityId && i.releaseId === releaseId).sort(byOrder);

  const cols: Axis[] = ws.activities.map((a) => ({ id: a.id, name: a.name }));
  if (ws.items.some((i) => i.activityId === null)) cols.push({ id: null, name: 'Unassigned' });
  const rows: Axis[] = [...ws.releases.map((r) => ({ id: r.id, name: r.name })), { id: null, name: 'Backlog' }];

  // Gaps: a journey step with no story in a release slice means that slice
  // doesn't support the full journey. The first release is the walking skeleton.
  const firstRelease = ws.releases[0];
  const skeletonGaps = firstRelease ? ws.activities.filter((a) => cell(a.id, firstRelease.id).length === 0) : [];
  const uncovered = ws.activities.filter((a) => !ws.items.some((i) => i.activityId === a.id));
  const isGap = (a: Axis, r: Axis) => showGaps && a.id !== null && r.id !== null && cell(a.id, r.id).length === 0;

  const move = (id: string, activityId: string | null, releaseId: string | null) =>
    dispatch({ type: 'item/update', id, patch: { activityId, releaseId } });

  return (
    <div className="view">
      <div className="view-bar">
        <div>
          <h2>Story map</h2>
          <p className="muted small">
            Journey steps left to right, release slices top to bottom. Drag cards to re-slice; click one to edit it.
          </p>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={showGaps} onChange={(e) => setShowGaps(e.target.checked)} />
          Highlight gaps
        </label>
      </div>

      {showGaps && (skeletonGaps.length > 0 || uncovered.length > 0) && (
        <div className="gap-banner" role="status">
          {skeletonGaps.length > 0 && firstRelease && (
            <p>
              <strong>{firstRelease.name}</strong> doesn't cover{' '}
              {skeletonGaps.map((a) => a.name).join(', ')}, so users can't complete the whole journey in this release.
            </p>
          )}
          {uncovered.length > 0 && (
            <p>
              No stories at all for <strong>{uncovered.map((a) => a.name).join(', ')}</strong>.
            </p>
          )}
        </div>
      )}

      <div className="map-scroll">
        <div className="map-grid" style={{ gridTemplateColumns: `9rem repeat(${cols.length}, minmax(13rem, 1fr)) auto` }}>
          {/* Backbone */}
          <div className="map-corner muted small">Journey →</div>
          {cols.map((a) => (
            <div key={a.id ?? 'none'} className={cx('backbone', a.id === null && 'backbone-unassigned')}>
              {a.id ? (
                <InlineEdit
                  label="journey step"
                  value={a.name}
                  onCommit={(name) => dispatch({ type: 'lane/update', kind: 'activities', id: a.id!, patch: { name } })}
                />
              ) : (
                <span>{a.name}</span>
              )}
            </div>
          ))}
          <div className="map-add-col">
            <AddInline
              label="+ Step"
              placeholder="Journey step"
              onAdd={(name) => dispatch({ type: 'lane/add', kind: 'activities', lane: createLane(name) })}
            />
          </div>

          {/* Release slices */}
          {rows.map((r) => (
            <Row key={r.id ?? 'backlog'}>
              <div className={cx('slice-label', r.id === null && 'slice-backlog')}>
                {r.id ? (
                  <InlineEdit
                    label="release"
                    value={r.name}
                    onCommit={(name) => dispatch({ type: 'lane/update', kind: 'releases', id: r.id!, patch: { name } })}
                  />
                ) : (
                  <span>{r.name}</span>
                )}
              </div>
              {cols.map((a) => {
                const items = cell(a.id, r.id);
                const gap = isGap(a, r);
                const strong = gap && r.id === firstRelease?.id;
                return (
                  <DropCell
                    key={`${a.id}-${r.id}`}
                    label={`${a.name}, ${r.name}`}
                    className={cx('map-cell', r.id === null && 'map-cell-backlog', gap && 'gap', strong && 'gap-strong')}
                    onDropItem={(id) => move(id, a.id, r.id)}
                  >
                    {gap && <span className="gap-tag">Gap</span>}
                    {items.map((it) => (
                      <Card key={it.id} item={it} variant="map" />
                    ))}
                    <QuickAdd fields={{ activityId: a.id, releaseId: r.id }} />
                  </DropCell>
                );
              })}
              <div />
            </Row>
          ))}
        </div>
        <div className="map-foot">
          <AddInline
            label="+ Release"
            placeholder="Release name"
            onAdd={(name) => dispatch({ type: 'lane/add', kind: 'releases', lane: createLane(name) })}
          />
        </div>
      </div>
    </div>
  );
}

// Grid children are laid out by the parent grid; this only groups them for readability.
function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
