import { useCallback, useEffect, useRef, useState } from 'react';
import { blankWorkspace, parseWorkspace, seedWorkspace } from './model';
import { OpenItemProvider, useWorkspace } from './store';
import { download, slugify } from './files';
import { cx } from './components/ui';
import { ItemDrawer } from './components/ItemDrawer';
import { StructurePanel } from './components/StructurePanel';
import { StoryMap } from './views/StoryMap';
import { TableView } from './views/TableView';
import { Roadmap } from './views/Roadmap';

const VIEWS = [
  { id: 'map', label: 'Story map', hint: 'Workshops: journey & gaps' },
  { id: 'table', label: 'Table', hint: 'Source of truth: filter & maintain' },
  { id: 'roadmap', label: 'Roadmap', hint: 'Execs & customers: Now / Next / Later' },
] as const;
type ViewId = (typeof VIEWS)[number]['id'];

const readHash = (): ViewId => {
  const h = window.location.hash.slice(1);
  return VIEWS.some((v) => v.id === h) ? (h as ViewId) : 'map';
};

export default function App() {
  const { ws, dispatch } = useWorkspace();
  const [view, setView] = useState<ViewId>(readHash);
  const [openId, setOpenId] = useState<string | null>(null);
  const [structureOpen, setStructureOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onHash = () => setView(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.title = `${ws.name} · Journey-view`;
  }, [ws.name]);

  const closeDrawer = useCallback(() => setOpenId(null), []);
  const closeStructure = useCallback(() => setStructureOpen(false), []);
  const openItem = ws.items.find((i) => i.id === openId);

  const exportJson = () =>
    download(`${slugify(ws.name)}.journey.json`, JSON.stringify(ws, null, 2), 'application/json');

  const importJson = async (file: File) => {
    try {
      const next = parseWorkspace(JSON.parse(await file.text()));
      if (confirm(`Replace "${ws.name}" with "${next.name}" (${next.items.length} items)? Export first to keep the current one.`)) {
        dispatch({ type: 'workspace/replace', workspace: next });
        setOpenId(null);
      }
    } catch (e) {
      alert(`Couldn't import that file: ${(e as Error).message}`);
    }
  };

  const replaceWith = (label: string, make: typeof seedWorkspace) => {
    if (confirm(`${label}? This replaces "${ws.name}". Export first to keep it.`)) {
      dispatch({ type: 'workspace/replace', workspace: make() });
      setOpenId(null);
    }
  };

  return (
    <OpenItemProvider value={setOpenId}>
      <div className={cx('app', openItem && 'drawer-open')}>
        <header className="topbar no-print">
          <div className="brand">
            <span className="logo" aria-hidden>
              ◧
            </span>
            <span className="brand-name">Journey-view</span>
            <input
              className="ws-name"
              aria-label="Workspace name"
              value={ws.name}
              onChange={(e) => dispatch({ type: 'workspace/rename', name: e.target.value })}
            />
          </div>
          <nav className="tabs" aria-label="Views">
            {VIEWS.map((v) => (
              <a key={v.id} href={`#${v.id}`} className={cx('tab', view === v.id && 'active')} aria-current={view === v.id ? 'page' : undefined} title={v.hint}>
                {v.label}
              </a>
            ))}
          </nav>
          <div className="top-actions">
            <button className="btn" onClick={() => setStructureOpen(true)}>
              Structure
            </button>
            <button className="btn" onClick={exportJson}>
              Export
            </button>
            <button className="btn" onClick={() => fileInput.current?.click()}>
              Import
            </button>
            <details className="menu">
              <summary className="btn" aria-label="More actions">
                ⋯
              </summary>
              <div className="menu-pop">
                <button onClick={() => replaceWith('Load the sample journey', seedWorkspace)}>Load sample journey</button>
                <button onClick={() => replaceWith('Start a blank workspace', blankWorkspace)}>Start blank workspace</button>
              </div>
            </details>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importJson(f);
                e.target.value = '';
              }}
            />
          </div>
        </header>

        <main className="main">
          {view === 'map' && <StoryMap />}
          {view === 'table' && <TableView />}
          {view === 'roadmap' && <Roadmap />}
        </main>

        {openItem && <ItemDrawer key={openItem.id} item={openItem} onClose={closeDrawer} />}
        {structureOpen && <StructurePanel onClose={closeStructure} />}
      </div>
    </OpenItemProvider>
  );
}
