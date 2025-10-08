# SeaLines: Archipelago RTS — Production Blueprint

This document outlines the vision, gameplay pillars, technical architecture, and milestone roadmap for delivering **SeaLines: Archipelago RTS**, a logistics-driven naval strategy experience that emphasizes planning over high APM. It is intended to guide engineering, design, art, and operations teams as development progresses.

---

## 1. Game Concept

### Elevator Pitch
*SeaLines* is a naval-focused RTS about logistics, scouting, and positional control across a dynamic island chain. It rewards anticipation and planning over frantic micro: players script standing orders, protect convoys, and exploit fog-of-war, currents, and weather to dominate the archipelago.

### What Makes It Fresh
- **Logistics is king:** Production output depends on uninterrupted supply routes (fuel, food, parts). Raiding a single chokepoint can collapse an opponent’s economy.
- **Standing orders, not micro:** Players create reusable playbooks (escort convoy, patrol arc, shadow enemy, feint & retreat) that units follow automatically until overridden.
- **Dynamic sea & sky:** Wind, visibility, and currents shift lanes, keeping the map alive and constantly changing the risk calculus.

### Match Formats & Win Conditions
| Mode | Duration | Notes |
| --- | --- | --- |
| 1v1 | 10–20 min | Competitive ladder focus. |
| 2v2 | 15–30 min | Emphasizes coordination of logistics corridors. |
| FFA | 20–30 min | Political play and convoy raiding chaos. |

Victory is earned through:
- **Island control points (tickets).**
- **Logistical supremacy** — starve enemy supply for *N* minutes.
- **HQ elimination.**

---

## 2. Gameplay Systems

### Core Loop
1. **Scout** → identify resource islands & safe shipping lanes.
2. **Establish** → build Harbor + Warehouse + basic Power to activate an island.
3. **Connect** → set up convoy routes (auto-created waypoints with escorts).
4. **Deny** → raid enemy lanes, mine chokepoints, mislead with decoys.
5. **Escalate** → tech into better hulls, sensors, and coastal artillery.
6. **Crush** → synchronized strikes (jam + torpedo + shore battery) to break their economy.

### Economy & Resources
- **Credits:** Universal currency from controlled islands & trade posts.
- **Supply Capacity:** Throughput based on active convoys, warehouse adjacency, and power. Caps production/repairs.
- **Fuel:** Consumed by combat ships & aircraft drones; heavy hulls burn more in storms.

**Supply Pressure** ties it all together. Each island has a `pressure` score (0–100) derived from incoming convoys, storage, and uptime. Buildings produce at `pressure%`. Blockades drop pressure → slow builds/repairs → compounding advantages for the raider.

### Buildings
| Building | Tier | Role |
| --- | --- | --- |
| **HQ Harbor** | T0 | Starting base; unlocks Shipyard I, Warehouse I, Radar I. |
| **Warehouse** | I–III | Boosts supply pressure & build speed; adjacency buffs. |
| **Power (Wind/Solar/Wave)** | I–II | Provides power; storms buff Wave, calm days buff Solar. |
| **Shipyard** | I–III | Produces hulls; higher tiers unlock heavier ships. |
| **Drydock** | I | Fast repairs; consumes extra fuel/supplies. |
| **Trade Post** | I | Converts surplus into credits; spawns neutral traders. |
| **Coastal Battery** | I–II | Shore defense; vulnerable without power/spotting. |
| **Radar/Sonar Station** | I–II | Detection radius + stealth counter. |
| **Air Dock** | II | Launches short-range recon drones. |
| **Mine Depot** | II | Lays sea mines on preset lanes; telegraphed. |
| **Comms Jammer** | II | Disrupts orders, slows radar refresh. |

### Units
**Tier I (Early)**
- *Sloop (Scout):* very fast, wide vision, paper armor.
- *Workboat (Utility):* lays buoys, repairs; no guns.
- *Corvette (Escort):* hunts subs at short range; protects transports.
- *Transport (Light):* carries marines to capture neutral islands; fragile.

**Tier II (Mid)**
- *Frigate (Line ship):* balanced guns/speed; backbone of fleets.
- *Submarine (Stealth):* ambushes heavy ships & transports; weak vs corvettes/sonar nets.
- *Artillery Barge (Siege):* slow but outranges coastal batteries when spotted.

**Tier III (Late)**
- *Destroyer:* anti-sub + flak; fast strike leader.
- *Cruiser:* heavy guns; anchors pushes but fuel-hungry.
- *Escort Carrier:* launches recon/decoy drones; logistics sink.

**Special**
- *Marine Detachment:* transported infantry capturing islands/structures.
- *Decoy Floats:* spoof radar signatures to force misreads.

### Vision, Fog, and Stealth
- True fog-of-war with LOS blocked by islands and weather.
- Sonar nets between buoy chains reveal subs.
- Night & storms reduce vision; radar/sonar partially compensate.

### Orders & Automation
- **Standing Orders:** patrol (arc/figure-8), screen convoy, hunter-killer, ambush at waypoint, mine-lay route.
- **Route Templates:** define safe lanes once; new convoys inherit them.
- **Engagement Rules:** aggressive, hold fire, kite, escort tight, etc.
- **Queueing & Sync:** plan multi-prong attacks that launch on H-Hour (server time).

### Tech Tree Examples
Hull upgrades, fuel efficiency, sensors, logistics OS, munitions, coastal upgrades — each adds strategic depth without demanding twitch inputs.

### Match Pacing Knobs
Early: fast scouting + cheap corvettes. Mid: trade posts and submarines swing economy. Late: attrition & decisive pushes with storm timing.

---

## 3. Technical Architecture

### Client
- **Stack:** TypeScript + Vite + PixiJS (2D WebGL) for a performant orthographic presentation.
- **Entity Component System:** `bitecs` for deterministic simulation of movement, combat, and effects.
- **Workers:** Web Workers handle A* pathfinding, fog-of-war masking (OffscreenCanvas), and weather lane recalculations.
- **UI/UX:** React or lightweight state management layered over Pixi for HUD, orders, and route planning.

### Server
- **Runtime:** Node.js authoritative simulation running at fixed 30 ticks per second.
- **Networking:** WebSocket rooms (Colyseus or custom). Clients send intent commands; server applies them, produces delta snapshots at 10–15 Hz, and clients interpolate.
- **Determinism:** Server is source of truth with deterministic RNG (`seedrandom`). Clients only predict UI-level interactions.
- **Persistence:** PostgreSQL for accounts/MMR/history, Redis for transient room state, S3-compatible storage for replays/maps.
- **Pathfinding:** Hybrid lane graph + grid A* with dynamic costs for storms/mines, executed on worker pool threads.

### Tooling & Content
- Gameplay data in JSON/TypeScript tables for hull stats, tech unlocks, etc.
- Authoring tools (later milestone) for map templates, convoy routes, and weather timelines.
- Replay format: seed + command stream or periodic snapshots for resilient playback.

### Security & Reliability
- Server validates moves, evaluates fog/vision, and hides undiscovered intel from clients.
- Match recovery with reconnect & catch-up snapshots.
- Lightweight analytics to drive balance (match length, unit K/D, supply pressure charts).

---

## 4. Development Roadmap

Each milestone targets a shippable slice with clearly defined acceptance criteria.

### Milestone A — Foundation & Vertical Slice
**Goals:**
- Map renderer, camera controls, selection, and minimal HUD.
- Single island map with water tiles and lane graph A*.
- Units: Sloop, Corvette, Transport with move/patrol/escort orders.
- Offline skirmish sandbox against scripted AI.

**Acceptance Criteria:**
- 500 path queries complete in <5 ms average on desktop dev hardware.
- Units obey standing orders without manual babysitting.
- Sandbox battle can be completed end-to-end without crashes.

### Milestone B — Networking & Fog
**Goals:**
- Authoritative server loop with intent → snapshot pipeline and interpolation.
- Fog-of-war mask with LOS and neutral island capture.
- Minimal economy (credits) and match flow (create/join/end) with ELO stub.

**Acceptance Criteria:**
- 150 ms RTT playtests feel responsive (input latency <120 ms perceived).
- Hidden units never leak across fog boundaries.
- Match replay from command stream matches live outcome.

### Milestone C — Logistics Core
**Goals:**
- Warehouses, Power, Shipyard I with Supply Pressure affecting build/repair rates.
- Convoy route editor, standing orders UI, and convoy throughput simulation.
- Raider gameplay with mine deployment and pressure disruption.

**Acceptance Criteria:**
- Island at 0 pressure produces ≤10% of nominal output within 3 ticks.
- Raiding a convoy lane reduces target island pressure within 10 s.
- Convoys automatically reroute when assigned safe lane templates.

### Milestone D — Midgame & Counterplay
**Goals:**
- Submarine, Frigate, Coastal Battery, Radar I systems.
- Sonar nets via buoy chains, depth charges, and trade post swings.
- Dynamic storms affecting lanes/vision and UI telegraphing windows.

**Acceptance Criteria:**
- Sonar nets reveal subs within defined radius; false positives ≤5%.
- Storm path recalculations complete within 16 ms budget on worker thread.
- Trade post capture swings supply pressure ≥15% within 30 s.

### Milestone E — Content & Polish
**Goals:**
- Tech tree Tier I–II, balance pass on costs/speeds.
- Sound, combat hit feedback, onboarding “win by supply” tutorial.
- Replays and basic spectator camera.

**Acceptance Criteria:**
- Tutorial completion rate ≥90% in usability tests.
- Replay desync rate <1% across 100 sample matches.
- Frame rate ≥60 FPS on mid-tier laptop at 1080p.

### Milestone F — PvP Alpha & Hardening
**Goals:**
- MMR matchmaking, surrender/pause, disconnect recovery.
- Server scaling & observability (metrics, logging, alerts).
- Closed playtest with telemetry-driven tuning.

**Acceptance Criteria:**
- Matchmaking pairings average <60 s queue for prime-time NA/EU.
- Server CPU utilization ≤70% at 200 concurrent players per region.
- Observability dashboards highlight supply pressure trends post-match.

---

## 5. Build & Release Pipeline

### Local Tooling
- **Package Management:** `pnpm` preferred (fallback `npm`) for deterministic installs.
- **Linting:** ESLint + Prettier for TypeScript; Stylelint for UI styling when introduced.
- **Testing:** Vitest for client logic, Jest for shared utilities, Playwright for end-to-end battle flows.
- **Server Tests:** ts-node + Jest (integration), load tests via k6 or artillery.

### Continuous Integration (GitHub Actions)
1. **Setup Node:** matrix over LTS versions (18, 20) once code exists.
2. **Install Dependencies:** `pnpm install --frozen-lockfile` (guarded by presence of lockfile).
3. **Static Analysis:** `pnpm lint`.
4. **Unit Tests:** `pnpm test -- --runInBand`.
5. **Build Artifacts:** `pnpm build` for client/server packages.
6. **Artifact Upload:** zipped build outputs + coverage.

Pipeline is designed to short-circuit gracefully while the project lacks a `package.json` to keep early commits green.

### Continuous Deployment (Future)
- Containerize client (static bundle) & server (Node.js) via Docker.
- Push images to GHCR with semver tags.
- Deploy server images to Kubernetes or Fly.io; host client on CDN (Cloudflare Pages / S3 + CloudFront).
- Infrastructure-as-code with Terraform, including Redis/PostgreSQL provisioning.

### Observability & Operations
- Structured logging (pino) with ship & convoy identifiers.
- Metrics via Prometheus + Grafana dashboards (supply pressure, convoy uptime, match duration).
- Alerting for queue spikes, server tick overruns, and snapshot delay anomalies.

---

## 6. Risks & Mitigations
- **Simulation Complexity:** ECS + deterministic RNG with authoritative server reduces sync bugs. Early investment in replay tooling accelerates debugging.
- **Network Latency:** Client interpolation and minimal prediction keep controls responsive; server tick budget tracked via profiling.
- **Logistics Balance:** Telemetry on supply pressure and convoy uptime ensures data-driven tuning.
- **Content Scope Creep:** Milestone gating with clear acceptance criteria and backlog grooming prevents overload.

---

## 7. Next Steps
1. Stand up repository scaffolding (current milestone).
2. Prototype PixiJS map renderer & ECS integration (Milestone A start).
3. Define data schemas for units/buildings/tech in JSON.
4. Begin implementing CI tasks once the client/server packages are initialized.
5. Schedule internal milestone reviews to adjust pacing & scope.

This blueprint should be revisited at the end of each milestone to capture lessons learned and adjust future deliverables.
