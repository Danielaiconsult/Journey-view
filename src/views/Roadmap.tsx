import { CSSProperties, useState } from 'react';
import { byOrder, createLane, HORIZONS, Horizon, Item } from '../model';
import { useWorkspace } from '../store';
import { AddInline, Card, cx, DropCell } from '../components/ui';

type Audience = 'internal' | 'customer';

export function Roadmap() {
  const { ws, dispatch } = useWorkspace();
  const [audience, setAudience] = useState<Audience>('internal');
  const customer = audience === 'customer';

  const visible = customer ? ws.items.filter((i) => i.customerVisible) : ws.items;
  const scheduled = visible.filter((i) => i.horizon !== null);
  const unscheduled = ws.items.filter((i) => i.horizon === null).sort(byOrder);

  const rows: { id: string | null; name: string; color?: string }[] = ws.themes
    .filter((t) => !customer || scheduled.some((i) => i.themeId === t.id))
    .map((t) => ({ id: t.id, name: t.name, color: t.color }));
  if (scheduled.some((i) => i.themeId === null)) rows.push({ id: null, name: 'Other' });

  const cell = (themeId: string | null, horizon: Horizon): Item[] =>
    scheduled.filter((i) => i.themeId === themeId && i.horizon === horizon).sort(byOrder);

  const place = (id: string, themeId: string | null, horizon: Horizon | null) =>
    dispatch({ type: 'item/update', id, patch: horizon ? { themeId, horizon } : { horizon: null } });

  return (
    <div className={cx('view', customer && 'roadmap-customer')}>
      <div className="view-bar">
        <div>
          <h2>{customer ? `${ws.name} roadmap` : 'Roadmap'}</h2>
          <p className="muted small">
            {customer
              ? 'What we are working on now, next and later. Plans can change as we learn.'
              : 'Themes × Now / Next / Later. Drag to re-prioritise; the story map and table update too.'}
          </p>
        </div>
        <div className="bar-actions no-print">
          <div className="segmented" role="group" aria-label="Audience">
            <button className={cx(!customer && 'active')} aria-pressed={!customer} onClick={() => setAudience('internal')}>
              Internal
            </button>
            <button className={cx(customer && 'active')} aria-pressed={customer} onClick={() => setAudience('customer')}>
              Customer
            </button>
          </div>
          <button className="btn" onClick={() => window.print()}>
            Print / PDF
          </button>
        </div>
      </div>

      {customer && (
        <p className="info-banner no-print">
          Customer view shows only items marked “Show on the customer roadmap”, without status, owners or internal
          notes. Present this view to customers or print it.
        </p>
      )}

      <div className="roadmap-scroll">
        <div className="roadmap-grid">
          <div className="roadmap-corner" />
          {HORIZONS.map((h) => (
            <div key={h.id} className={cx('horizon-head', `horizon-${h.id}`)}>
              <strong>{h.name}</strong>
              <span className="muted small">{h.hint}</span>
            </div>
          ))}

          {rows.map((t) => (
            <ThemeRow key={t.id ?? 'other'}>
              <div className="theme-label" style={{ '--card-accent': t.color ?? 'var(--neutral-accent)' } as CSSProperties}>
                <span className="dot" />
                <span>{t.name}</span>
              </div>
              {HORIZONS.map((h) => {
                const items = cell(t.id, h.id);
                const content = items.map((it) => <Card key={it.id} item={it} variant={customer ? 'customer' : 'roadmap'} />);
                return customer ? (
                  <div key={h.id} className="roadmap-cell">
                    {content}
                  </div>
                ) : (
                  <DropCell
                    key={h.id}
                    label={`${t.name}, ${h.name}`}
                    className="roadmap-cell"
                    onDropItem={(id) => place(id, t.id, h.id)}
                  >
                    {content}
                  </DropCell>
                );
              })}
            </ThemeRow>
          ))}
          {rows.length === 0 && <p className="muted roadmap-empty">Nothing on the roadmap yet.</p>}
        </div>
      </div>

      {!customer && (
        <>
          <div className="map-foot">
            <AddInline
              label="+ Theme"
              placeholder="Theme name"
              onAdd={(name) => dispatch({ type: 'lane/add', kind: 'themes', lane: createLane(name) })}
            />
          </div>
          <DropCell className="tray" label="Not on the roadmap" onDropItem={(id) => place(id, null, null)}>
            <h3>
              Not on the roadmap <span className="muted small">({unscheduled.length}) · drag onto a cell to schedule</span>
            </h3>
            <div className="tray-items">
              {unscheduled.map((it) => (
                <Card key={it.id} item={it} variant="roadmap" />
              ))}
              {unscheduled.length === 0 && <span className="muted small">Everything is scheduled.</span>}
            </div>
          </DropCell>
        </>
      )}
    </div>
  );
}

function ThemeRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
