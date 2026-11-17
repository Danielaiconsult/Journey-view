import { CSSProperties, DragEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { createItem, Item, laneById, nextOrder, statusName, horizonName } from '../model';
import { useOpenItem, useWorkspace } from '../store';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const DRAG_MIME = 'text/plain';

// ---------- Card ----------

export type CardVariant = 'map' | 'roadmap' | 'customer';

export function Card({ item, variant }: { item: Item; variant: CardVariant }) {
  const { ws } = useWorkspace();
  const openItem = useOpenItem();
  const theme = laneById(ws.themes, item.themeId);
  const draggable = variant !== 'customer';

  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData(DRAG_MIME, item.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openItem(item.id);
    }
  };

  return (
    <div
      className={cx('card', `card-${variant}`, item.status === 'done' && 'card-done')}
      style={{ '--card-accent': theme?.color ?? 'var(--neutral-accent)' } as CSSProperties}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onClick={variant === 'customer' ? undefined : () => openItem(item.id)}
      onKeyDown={variant === 'customer' ? undefined : onKeyDown}
      role={variant === 'customer' ? undefined : 'button'}
      tabIndex={variant === 'customer' ? undefined : 0}
    >
      <div className="card-title">{item.title}</div>
      {variant === 'customer' ? (
        item.description && <div className="card-desc">{item.description}</div>
      ) : (
        <div className="card-meta">
          <span className={cx('chip', `status-${item.status}`)}>{statusName(item.status)}</span>
          {variant === 'map' && item.horizon && <span className="chip">{horizonName(item.horizon)}</span>}
          {variant === 'roadmap' && item.activityId && (
            <span className="chip chip-quiet">{laneById(ws.activities, item.activityId)?.name}</span>
          )}
          {variant === 'roadmap' && !item.customerVisible && (
            <span className="chip chip-internal" title="Hidden from the customer roadmap">
              Internal
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Drop target ----------

export function DropCell({
  onDropItem,
  className,
  children,
  label,
}: {
  onDropItem: (id: string) => void;
  className?: string;
  children: ReactNode;
  label?: string;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={cx(className, over && 'drop-over')}
      aria-label={label}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!over) setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData(DRAG_MIME);
        if (id) onDropItem(id);
      }}
    >
      {children}
    </div>
  );
}

// ---------- Quick add (fast entry for workshops: stays open after Enter) ----------

export function QuickAdd({ fields, label = '+ Add card' }: { fields: Partial<Item>; label?: string }) {
  const { ws, dispatch } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  if (!editing) {
    return (
      <button className="quick-add" onClick={() => setEditing(true)}>
        {label}
      </button>
    );
  }
  const submit = () => {
    const title = text.trim();
    if (!title) return;
    dispatch({ type: 'item/add', item: createItem({ ...fields, title }, nextOrder(ws.items)) });
    setText('');
  };
  return (
    <textarea
      className="quick-add-input"
      autoFocus
      rows={2}
      placeholder="Type and press Enter. Esc to finish."
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submit();
        } else if (e.key === 'Escape') {
          setText('');
          setEditing(false);
        }
      }}
      onBlur={() => {
        submit();
        setEditing(false);
      }}
    />
  );
}

// ---------- Inline rename ----------

export function InlineEdit({
  value,
  onCommit,
  className,
  label,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);

  if (!editing) {
    return (
      <button
        className={cx('inline-edit', className)}
        title={`Rename ${label}`}
        onClick={() => {
          setDraft(value);
          cancelled.current = false;
          setEditing(true);
        }}
      >
        {value}
      </button>
    );
  }
  const commit = () => {
    const v = draft.trim();
    if (!cancelled.current && v && v !== value) onCommit(v);
    setEditing(false);
  };
  return (
    <input
      className={cx('inline-edit-input', className)}
      aria-label={`Rename ${label}`}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          cancelled.current = true;
          setEditing(false);
        }
      }}
    />
  );
}

/** A small "+ Something" button that turns into a text field. */
export function AddInline({ label, placeholder, onAdd }: { label: string; placeholder: string; onAdd: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  if (!editing) {
    return (
      <button className="btn btn-ghost btn-small" onClick={() => setEditing(true)}>
        {label}
      </button>
    );
  }
  const done = (save: boolean) => {
    if (save && text.trim()) onAdd(text.trim());
    setText('');
    setEditing(false);
  };
  return (
    <input
      className="inline-edit-input"
      autoFocus
      placeholder={placeholder}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => done(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') done(true);
        if (e.key === 'Escape') done(false);
      }}
    />
  );
}

// ---------- Modal ----------

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
