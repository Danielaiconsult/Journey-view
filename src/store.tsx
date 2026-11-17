import { createContext, Dispatch, ReactNode, useContext, useEffect, useReducer } from 'react';
import { parseWorkspace, seedWorkspace, Workspace } from './model';
import { Action, reducer } from './reducer';

const STORAGE_KEY = 'journey-view:workspace:v1';

function load(): Workspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return parseWorkspace(JSON.parse(raw));
  } catch {
    // Storage blocked or data corrupt: fall back to the sample.
  }
  return seedWorkspace();
}

interface Ctx {
  ws: Workspace;
  dispatch: Dispatch<Action>;
}

const WorkspaceContext = createContext<Ctx | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [ws, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ws));
    } catch {
      // Ignore: private mode or quota. Export still works.
    }
  }, [ws]);

  // Keep several open tabs in sync (e.g. table on one screen, story map on the projector).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        dispatch({ type: 'workspace/replace', workspace: parseWorkspace(JSON.parse(e.newValue)) });
      } catch {
        /* ignore malformed */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return <WorkspaceContext.Provider value={{ ws, dispatch }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): Ctx {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}

// UI-only state shared across views: which item is open in the detail drawer.
const OpenItemContext = createContext<(id: string) => void>(() => {});
export const OpenItemProvider = OpenItemContext.Provider;
export const useOpenItem = () => useContext(OpenItemContext);
