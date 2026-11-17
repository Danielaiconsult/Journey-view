import { createLane, LaneKind, LANE_FIELD, LANE_LABEL } from '../model';
import { useWorkspace } from '../store';
import { AddInline, Modal } from './ui';

const KINDS: LaneKind[] = ['activities', 'releases', 'themes'];

function LaneList({ kind }: { kind: LaneKind }) {
  const { ws, dispatch } = useWorkspace();
  const lanes = ws[kind];
  const field = LANE_FIELD[kind];
  const label = LANE_LABEL[kind];

  return (
    <section className="lane-list">
      <h3>{label.plural}</h3>
      <p className="muted small">{label.help}</p>
      <ol>
        {lanes.map((lane, i) => {
          const count = ws.items.filter((it) => it[field] === lane.id).length;
          return (
            <li key={lane.id}>
              {kind === 'themes' && (
                <input
                  type="color"
                  aria-label={`Color for ${lane.name}`}
                  value={lane.color ?? '#888888'}
                  onChange={(e) => dispatch({ type: 'lane/update', kind, id: lane.id, patch: { color: e.target.value } })}
                />
              )}
              <input
                className="lane-name"
                aria-label={`${label.singular} name`}
                value={lane.name}
                onChange={(e) => dispatch({ type: 'lane/update', kind, id: lane.id, patch: { name: e.target.value } })}
              />
              <span className="muted small lane-count" title="Items in this lane">
                {count}
              </span>
              <button
                className="btn btn-ghost btn-icon"
                aria-label={`Move ${lane.name} up`}
                disabled={i === 0}
                onClick={() => dispatch({ type: 'lane/move', kind, id: lane.id, delta: -1 })}
              >
                ↑
              </button>
              <button
                className="btn btn-ghost btn-icon"
                aria-label={`Move ${lane.name} down`}
                disabled={i === lanes.length - 1}
                onClick={() => dispatch({ type: 'lane/move', kind, id: lane.id, delta: 1 })}
              >
                ↓
              </button>
              <button
                className="btn btn-ghost btn-icon"
                aria-label={`Delete ${lane.name}`}
                onClick={() => {
                  if (
                    count === 0 ||
                    confirm(`Delete "${lane.name}"? Its ${count} item(s) are kept but become unassigned here.`)
                  ) {
                    dispatch({ type: 'lane/delete', kind, id: lane.id });
                  }
                }}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ol>
      <AddInline
        label={`+ ${label.singular}`}
        placeholder={`New ${label.singular.toLowerCase()} name`}
        onAdd={(name) => dispatch({ type: 'lane/add', kind, lane: createLane(name) })}
      />
    </section>
  );
}

export function StructurePanel({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Structure" onClose={onClose}>
      <p className="muted">These lists shape all three views. Rename or reorder here and every view updates.</p>
      <div className="structure-grid">
        {KINDS.map((k) => (
          <LaneList key={k} kind={k} />
        ))}
      </div>
    </Modal>
  );
}
