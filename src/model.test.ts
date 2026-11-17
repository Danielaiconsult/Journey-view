import { describe, expect, it } from 'vitest';
import { createItem, createLane, parseWorkspace, seedWorkspace, Workspace } from './model';
import { reducer } from './reducer';
import { toCsv } from './files';

function tiny(): Workspace {
  const step = createLane('Step');
  const rel = createLane('MVP');
  const theme = createLane('Theme', '#000000');
  return {
    version: 1,
    name: 'Test',
    activities: [step],
    releases: [rel],
    themes: [theme],
    items: [
      createItem({ title: 'A', activityId: step.id, releaseId: rel.id, themeId: theme.id, horizon: 'now' }, 1),
      createItem({ title: 'B', activityId: step.id, releaseId: rel.id }, 2),
    ],
  };
}

describe('single source of truth', () => {
  it('a move in one view is a field change every view sees', () => {
    const ws = tiny();
    const [a] = ws.items;
    const next = reducer(ws, { type: 'item/update', id: a.id, patch: { horizon: 'later', releaseId: null } });
    const moved = next.items.find((i) => i.id === a.id)!;
    expect(moved.horizon).toBe('later'); // roadmap column
    expect(moved.releaseId).toBeNull(); // story map row (backlog)
    expect(moved.title).toBe('A'); // same record
    expect(next.items).toHaveLength(2);
  });

  it('moving to another cell puts the card last; plain edits keep its position', () => {
    const ws = tiny();
    const [a] = ws.items;
    const renamed = reducer(ws, { type: 'item/update', id: a.id, patch: { title: 'A2' } });
    expect(renamed.items[0].order).toBe(1);
    const moved = reducer(ws, { type: 'item/update', id: a.id, patch: { horizon: 'next' } });
    expect(moved.items[0].order).toBe(3);
  });

  it('deleting a lane keeps its items and unassigns them', () => {
    const ws = tiny();
    const next = reducer(ws, { type: 'lane/delete', kind: 'activities', id: ws.activities[0].id });
    expect(next.activities).toHaveLength(0);
    expect(next.items).toHaveLength(2);
    expect(next.items.every((i) => i.activityId === null)).toBe(true);
    expect(next.items[0].themeId).toBe(ws.themes[0].id);
  });

  it('reorders lanes and ignores moves past the ends', () => {
    let ws = tiny();
    ws = reducer(ws, { type: 'lane/add', kind: 'releases', lane: createLane('R2') });
    const [mvp, r2] = ws.releases;
    expect(reducer(ws, { type: 'lane/move', kind: 'releases', id: r2.id, delta: -1 }).releases.map((r) => r.name)).toEqual(['R2', 'MVP']);
    expect(reducer(ws, { type: 'lane/move', kind: 'releases', id: mvp.id, delta: -1 })).toBe(ws);
  });

  it('gives new themes a colour', () => {
    const ws = reducer(tiny(), { type: 'lane/add', kind: 'themes', lane: createLane('New') });
    expect(ws.themes[1].color).toMatch(/^#/);
  });
});

describe('parseWorkspace', () => {
  it('round-trips the sample', () => {
    const ws = seedWorkspace();
    expect(parseWorkspace(JSON.parse(JSON.stringify(ws)))).toEqual(ws);
  });

  it('drops dangling references and bad enum values', () => {
    const ws = tiny();
    const raw = JSON.parse(JSON.stringify(ws));
    raw.items[0].activityId = 'missing';
    raw.items[0].horizon = 'someday';
    raw.items[0].status = 'blocked';
    const parsed = parseWorkspace(raw);
    expect(parsed.items[0].activityId).toBeNull();
    expect(parsed.items[0].horizon).toBeNull();
    expect(parsed.items[0].status).toBe('idea');
  });

  it('rejects files that are not workspaces', () => {
    expect(() => parseWorkspace([])).toThrow();
    expect(() => parseWorkspace({ activities: [], releases: [], themes: [] })).toThrow(/items/);
    expect(() => parseWorkspace({ activities: [{}], releases: [], themes: [], items: [] })).toThrow(/activities/);
  });
});

describe('toCsv', () => {
  it('quotes and neutralises formulas', () => {
    expect(toCsv([['a,b', 'say "hi"', '=SUM(A1)', null, true]])).toBe('"a,b","say ""hi""",\'=SUM(A1),,true');
  });
});
