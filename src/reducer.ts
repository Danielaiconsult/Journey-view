import { Item, Lane, LaneKind, LANE_FIELD, PLACEMENT_FIELDS, THEME_COLORS, Workspace, nextOrder } from './model';

export type ItemPatch = Partial<Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'order'>>;

export type Action =
  | { type: 'item/add'; item: Item }
  | { type: 'item/update'; id: string; patch: ItemPatch }
  | { type: 'item/delete'; id: string }
  | { type: 'lane/add'; kind: LaneKind; lane: Lane }
  | { type: 'lane/update'; kind: LaneKind; id: string; patch: Partial<Omit<Lane, 'id'>> }
  | { type: 'lane/delete'; kind: LaneKind; id: string }
  | { type: 'lane/move'; kind: LaneKind; id: string; delta: -1 | 1 }
  | { type: 'workspace/rename'; name: string }
  | { type: 'workspace/replace'; workspace: Workspace };

const stamp = () => new Date().toISOString();

export function reducer(state: Workspace, action: Action): Workspace {
  switch (action.type) {
    case 'item/add':
      return { ...state, items: [...state.items, action.item] };

    case 'item/update': {
      const order = nextOrder(state.items);
      return {
        ...state,
        items: state.items.map((it) => {
          if (it.id !== action.id) return it;
          // Moving to a different cell puts the card at the end of that cell.
          const moved = PLACEMENT_FIELDS.some((f) => f in action.patch && action.patch[f] !== it[f]);
          return { ...it, ...action.patch, ...(moved ? { order } : {}), updatedAt: stamp() };
        }),
      };
    }

    case 'item/delete':
      return { ...state, items: state.items.filter((it) => it.id !== action.id) };

    case 'lane/add': {
      const lanes = state[action.kind];
      const lane =
        action.kind === 'themes' && !action.lane.color
          ? { ...action.lane, color: THEME_COLORS[lanes.length % THEME_COLORS.length] }
          : action.lane;
      return { ...state, [action.kind]: [...lanes, lane] };
    }

    case 'lane/update':
      return {
        ...state,
        [action.kind]: state[action.kind].map((l) => (l.id === action.id ? { ...l, ...action.patch } : l)),
      };

    case 'lane/delete': {
      // Deleting a lane never deletes items: they become unassigned in that dimension.
      const field = LANE_FIELD[action.kind];
      return {
        ...state,
        [action.kind]: state[action.kind].filter((l) => l.id !== action.id),
        items: state.items.map((it) => (it[field] === action.id ? { ...it, [field]: null, updatedAt: stamp() } : it)),
      };
    }

    case 'lane/move': {
      const lanes = [...state[action.kind]];
      const i = lanes.findIndex((l) => l.id === action.id);
      const j = i + action.delta;
      if (i < 0 || j < 0 || j >= lanes.length) return state;
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
      return { ...state, [action.kind]: lanes };
    }

    case 'workspace/rename':
      return { ...state, name: action.name };

    case 'workspace/replace':
      return action.workspace;
  }
}
