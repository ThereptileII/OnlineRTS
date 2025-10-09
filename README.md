# SeaLines: Archipelago RTS

SeaLines is a naval-focused real-time strategy prototype about logistics, scouting, and positional control across a dynamic chain of islands. The repository contains both the interactive skirmish sandbox and an authoritative simulation server alongside the planning documentation.

## Repository Layout

- `apps/client` – browser-based skirmish sandbox rendered with the Canvas API.
- `apps/server` – authoritative Node.js simulation service exposing a lightweight WebSocket endpoint.
- `packages/shared` – shared data tables and utilities (unit stats, map generation, pathfinding, ID helpers).
- `docs/` – design and production documentation, including milestone plans and acceptance criteria.
- `scripts/` – development helpers (local static file server for the client).
- `.github/workflows/` – continuous integration workflow running installs and tests on every push/PR.

## Prerequisites

SeaLines now runs without any third-party dependencies. Ensure you have Node.js 20 or newer installed.

## Development Workflow

### Launch the client sandbox

```bash
npm run dev:client
```

This starts a static file server on http://localhost:5173 that serves the Canvas-based sandbox. Controls mirror the RTS loop:

- **Camera** – middle-mouse drag to pan, scroll to zoom.
- **Selection** – left-click or drag to marquee units.
- **Orders** – right-click issues move/patrol/escort orders depending on the HUD mode (or press `M`, `P`, `E`). Patrol orders require two clicks: origin then destination. Escorts pick the nearest friendly ship to guard.

### Run the authoritative server

```bash
npm run dev:server
```

The server listens on `ws://localhost:7070`, advances the shared simulation at 30Hz, and broadcasts world snapshots to every connected client. Messages follow the JSON command/snapshot envelope documented in `apps/server/index.mjs`.

### Play without installing dependencies

You can produce an entirely self-contained offline build that runs straight from the filesystem—no package manager, local server, or additional libraries required.

1. Run the offline build script from the repository root:

   ```bash
   npm run build:offline
   ```

   This script compiles the Vite client and copies the output to `offline/client`.
2. Send the contents of `offline/client` to whoever wants to play offline (or double-click `offline/client/index.html` yourself). The game boots in any modern browser by simply opening that HTML file.

> 💡 Prefer not to build locally? Trigger the **“Offline Client Build”** GitHub Action (either on pushes to `main` or manually via the Actions tab). It uploads the ready-to-run bundle as an artifact named `offline-client` that you can download and unzip.

### Tests

```bash
npm test
```

The test suite uses Node's built-in runner to validate pathfinding behaviour and simulation order resolution. No external packages are required.

## Continuous Integration

GitHub Actions now runs two pipelines:

- **CI** – installs dependencies (none by default) and executes `npm test` to keep the codebase healthy.
- **Offline Client Build** – packages the static bundle described above and publishes it as a downloadable artifact so playtesters can run the game without setting up tooling.

As the project evolves, keep scripts self-contained so the pipelines remain deterministic without network access.

## Contributing

1. Review the milestone roadmap in `docs/game_plan.md` before tackling a feature.
2. Build features in focused branches, including updated docs and tests when appropriate.
3. Keep gameplay data table-driven to simplify balancing and iteration.
4. Maintain a working `npm test` baseline so CI stays green.

## License

The project is currently in pre-production; licensing will be formalised alongside the first public playtest build.
