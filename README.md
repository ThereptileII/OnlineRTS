# SeaLines: Archipelago RTS

SeaLines is a naval-focused real-time strategy prototype emphasizing logistics, scouting, and positional control across a dynamic chain of islands. This repository currently contains design documentation and development plans for building the playable experience and its supporting infrastructure.

## Repository Layout

- `apps/client` – Vite + PixiJS prototype of the playable skirmish sandbox.
- `apps/server` – Node.js authoritative simulation service with WebSocket broadcast loop.
- `packages/shared` – shared TypeScript types, data tables, and pathfinding utilities.
- `docs/` – high level planning documents outlining gameplay systems, technical architecture, milestones, and acceptance criteria.
- `.github/workflows/` – continuous integration pipelines that keep the project buildable and testable from GitHub.

## Getting Started

SeaLines is developed as an npm workspace. A recent Node.js LTS release (>=20) is required.

```bash
npm install
```

### Running the client sandbox

```bash
npm run dev
```

This command launches the Vite development server on port 5173. The playable slice showcases the map renderer, camera controls (middle mouse drag / scroll wheel zoom), unit selection (left-click or marquee), right-click movement, patrol automation (press **P** or the HUD button for a two-point patrol), and escort behaviour.

### Running the authoritative server

```bash
npm run dev --workspace @seelines/server
```

The server boots on `ws://localhost:7070`, simulates the same spawn configuration as the client sandbox, accepts command messages, and broadcasts simulation snapshots at 30 Hz.

### Building and testing

```bash
npm run build   # builds every workspace
npm run lint    # TypeScript type-checking across workspaces
npm test        # executes Vitest suites in shared + server packages
```

## Continuous Integration

GitHub Actions installs dependencies and runs the workspace `lint` and `test` scripts automatically. As additional packages (UI, gameplay systems, tooling) are introduced, CI will validate them without further configuration changes.

## Contributing

1. Follow the milestone roadmap in `docs/game_plan.md`.
2. Use feature branches and submit pull requests with clear summaries and test results.
3. Keep gameplay content data-driven (JSON/TS) to simplify balancing and iteration.
4. Update documentation as systems and pipelines evolve.

## License

The game is currently in pre-production; a license will be defined alongside the first playable build.
