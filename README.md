# Journey-view

Three views over one source of truth. Every card is a single record; each view is just a different way of looking at it.

| View | For | Layout | Moving a card changes |
|---|---|---|---|
| **Story map** | Workshops: see the journey and its gaps | Journey steps (columns) × release slices (rows) | `activityId`, `releaseId` |
| **Table** | The team: filter, sort and maintain | One row per item, every field editable inline | any field |
| **Roadmap** | Execs and customers | Themes (rows) × Now / Next / Later | `themeId`, `horizon` |

So when you drag a story into the MVP slice in a workshop, the table and roadmap already show it. When an exec moves it from *Next* to *Now*, the story map shows that too.

## Features

- **Story map:** drag and drop between cells, fast card entry (type, Enter, repeat), inline rename of steps and releases, and gap highlighting. Any journey step with nothing in the first release is flagged as a gap: users can't finish the journey in that release.
- **Table:** inline editing, search, filters by step / release / theme / horizon / status, column sorting, CSV export. New rows inherit the active filters.
- **Roadmap:** drag to re-prioritise, a tray of items that aren't on the roadmap yet, and an **Internal / Customer** switch. The customer view shows only items opted in with "Show on the customer roadmap", and hides status and owner. Print / PDF ready.
- **Structure panel:** rename, reorder, recolour and delete journey steps, releases and themes. Deleting one never deletes items; they become unassigned.
- **Detail drawer:** edit any item and see where it appears in each view.
- Saved in the browser (localStorage), and kept in sync across open tabs. **Export / Import** JSON for backup and sharing.

## Data model

```ts
Item {
  id, title, description, owner, status,   // idea | planned | in-progress | done
  activityId, releaseId,                   // story map placement
  themeId, horizon,                        // roadmap placement: now | next | later | null
  customerVisible,                         // opt-in for the customer roadmap
  order, createdAt, updatedAt
}
Workspace { name, activities[], releases[], themes[], items[] }
```

Story map steps (`activities`), releases and themes are ordered lists of `{ id, name, color? }`. See `src/model.ts`.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run build      # type-check + production build into dist/
```

## Deploy

`.github/workflows/deploy.yml` tests and builds on every push and pull request, and publishes `main` to GitHub Pages. To turn publishing on once: repo **Settings → Pages → Source: GitHub Actions**.

## Roadmap for the product itself

- Multi-user storage and real-time collaboration (currently single-browser)
- Shareable read-only customer roadmap link
- CSV import
- Step → task → story hierarchy in the story map
