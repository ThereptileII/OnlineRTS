import { Application, Container, Graphics } from "pixi.js";
import { findPath } from "@seelines/shared/pathfinding";
import { TILE_SIZE } from "@seelines/shared";
import type { Order, Vector2 } from "@seelines/shared";
import { CameraController } from "./camera";
import { MapRenderer } from "./renderer";
import { GameState } from "./state";
import type { GameEvent, SimulationOrder, UnitEntity } from "./state";
import { createSkirmishMap } from "@seelines/shared";
import { AiController } from "./ai";
import { generateId } from "./id";
import { Soundscape } from "./soundscape";
import { GraphicsEngine } from "./graphicsEngine";

const SELECT_THRESHOLD = 4;

type OrderMode = "move" | "patrol" | "escort";
type GameMode = "singleplayer" | "multiplayer";

interface GameOptions {
  container: HTMLElement | null;
  mode: GameMode;
}

export class Game {
  private readonly container: HTMLElement;
  private readonly mode: GameMode;
  private app?: Application;
  private camera?: CameraController;
  private readonly state = new GameState({
    map: createSkirmishMap(),
    tickRate: 30
  });
  private readonly renderer = new MapRenderer(this.state.map);
  private readonly world = new Container();
  private readonly selectionBox = new Graphics();
  private pointerDown?: Vector2;
  private pointerDragActive = false;
  private orderMode: OrderMode = "move";
  private pendingPatrol?: { origin: Vector2 };
  private debugPath?: Vector2[];
  private statusModeLabel?: HTMLElement | null;
  private statusSelectionLabel?: HTMLElement | null;
  private statusOpponentLabel?: HTMLElement | null;
  private statusLogisticsLabel?: HTMLElement | null;
  private islandStatusList?: HTMLElement | null;
  private convoyStatusList?: HTMLElement | null;
  private aiController?: AiController;
  private readonly soundscape = new Soundscape();
  private readonly graphics = new GraphicsEngine();
  private timeScale = 1;
  private targetTimeScale = 1;
  private tempoBoostUntil = 0;
  private readonly handleResize = (): void => {
    if (!this.app) return;
    const view = this.getCanvas();
    if (!view) return;
    const width = view.width || view.clientWidth || window.innerWidth;
    const height = view.height || view.clientHeight || window.innerHeight;
    this.graphics.resize(width, height);
    this.camera?.syncViewport();
  };

  constructor(options: GameOptions) {
    if (!options.container) {
      throw new Error("Game container not provided");
    }
    this.container = options.container;
    this.mode = options.mode;
    this.bootstrapUi();
    this.spawnInitialUnits();
    if (this.mode === "singleplayer") {
      this.aiController = new AiController({ state: this.state });
    }
    this.updateStrategicHud();
  }

  private now(): number {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  private pulseTempo(duration = 3200): void {
    this.tempoBoostUntil = Math.max(this.tempoBoostUntil, this.now() + duration);
  }

  private bootstrapUi(): void {
    const moveButton = document.getElementById("order-move");
    const patrolButton = document.getElementById("order-patrol");
    const escortButton = document.getElementById("order-escort");
    this.statusModeLabel = document.getElementById("status-mode");
    this.statusSelectionLabel = document.getElementById("status-selection");
    this.statusOpponentLabel = document.getElementById("status-opponent");
    this.statusLogisticsLabel = document.getElementById("status-logistics");
    this.islandStatusList = document.getElementById("island-status");
    this.convoyStatusList = document.getElementById("convoy-status");

    if (this.statusOpponentLabel) {
      this.statusOpponentLabel.textContent = `Opponent: ${
        this.mode === "singleplayer" ? "Computer" : "Another Player"
      }`;
    }

    const setMode = (mode: OrderMode): void => {
      this.orderMode = mode;
      for (const button of [moveButton, patrolButton, escortButton]) {
        button?.classList.toggle("active", button?.id === `order-${mode}`);
      }
      this.statusModeLabel &&
        (this.statusModeLabel.textContent = `Mode: ${mode[0]?.toUpperCase()}${mode.slice(1)}`);
      this.pendingPatrol = undefined;
    };

    moveButton?.addEventListener("click", () => setMode("move"));
    patrolButton?.addEventListener("click", () => setMode("patrol"));
    escortButton?.addEventListener("click", () => setMode("escort"));

    window.addEventListener("keydown", event => {
      if (event.key === "m" || event.key === "M") setMode("move");
      if (event.key === "p" || event.key === "P") setMode("patrol");
      if (event.key === "e" || event.key === "E") setMode("escort");
    });
  }

  private spawnInitialUnits(): void {
    const playerSpawnpoints: Array<{ type: UnitEntity["type"]; position: Vector2 }> = [
      { type: "sloop", position: { x: 3.5, y: 12.5 } },
      { type: "corvette", position: { x: 5, y: 13.5 } },
      { type: "transport", position: { x: 4.2, y: 15 } },
      { type: "frigate", position: { x: 6.5, y: 12.5 } },
      { type: "destroyer", position: { x: 7.8, y: 13.2 } }
    ];

    for (const spawn of playerSpawnpoints) {
      this.state.createUnit(spawn.type, spawn.position, "player");
    }

    if (this.mode === "singleplayer") {
      const computerSpawnpoints: Array<{ type: UnitEntity["type"]; position: Vector2 }> = [
        { type: "sloop", position: { x: 18.5, y: 4.5 } },
        { type: "corvette", position: { x: 20.2, y: 5.8 } },
        { type: "transport", position: { x: 21.4, y: 7.2 } },
        { type: "frigate", position: { x: 19.2, y: 6.7 } },
        { type: "submarine", position: { x: 17.6, y: 6.1 } }
      ];
      for (const spawn of computerSpawnpoints) {
        this.state.createUnit(spawn.type, spawn.position, "computer");
      }
    } else {
      const allySpawnpoints: Array<{ type: UnitEntity["type"]; position: Vector2 }> = [
        { type: "sloop", position: { x: 14, y: 4.5 } },
        { type: "corvette", position: { x: 16, y: 4 } }
      ];
      for (const spawn of allySpawnpoints) {
        this.state.createUnit(spawn.type, spawn.position, "player");
      }
    }
  }

  async start(): Promise<void> {
    const options = {
      backgroundColor: 0x02121f,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      resizeTo: window
    } as const;

    let app = new Application();
    const maybeInit = (app as unknown as { init?: (opts: typeof options) => Promise<void> }).init;

    if (typeof maybeInit === "function") {
      await maybeInit.call(app, options);
    } else {
      app.destroy?.();
      app = new Application(options as ConstructorParameters<typeof Application>[0]);
    }

    this.app = app;
    const canvas = this.getCanvas();

    if (!canvas) {
      throw new Error("Unable to determine PixiJS view canvas");
    }

    this.world.addChild(this.renderer.container);
    this.world.addChild(this.selectionBox);
    this.graphics.mount(this.app.stage);
    this.graphics.setWorld(this.world);
    this.camera = new CameraController({
      view: canvas,
      world: this.world
    });
    this.container.appendChild(canvas);
    this.handleResize();
    window.addEventListener("resize", this.handleResize);
    this.attachPointerHandlers();
    this.app.ticker.add(this.update);
    this.soundscape.start();
    this.render();
  }

  stop(): void {
    if (!this.app) return;
    this.app.ticker.remove(this.update);
    this.app.destroy();
    this.soundscape.stop();
    window.removeEventListener("resize", this.handleResize);
    this.camera?.destroy();
    this.graphics.detach();
  }

  private readonly update = (deltaTime: number): void => {
    const deltaSeconds = deltaTime / 60;
    const activeUnits = this.countActiveUnits();
    const now = this.now();
    const baseTarget = activeUnits > 0 ? 1.18 : 1;
    const boostTarget = now < this.tempoBoostUntil ? 1.32 : 1;
    this.targetTimeScale = Math.max(baseTarget, boostTarget);
    const easing = 1 - Math.exp(-deltaSeconds * 4.5);
    this.timeScale += (this.targetTimeScale - this.timeScale) * easing;
    const scaledDeltaTime = deltaTime * this.timeScale;
    const dt = scaledDeltaTime / (this.state.tickRate / 60);
    this.state.tick += this.timeScale;
    this.stepSimulation(dt);
    this.state.updateStrategicSystems(dt);
    this.handleEvents(this.state.consumeEvents());
    this.updateStrategicHud();
    this.camera?.update(deltaSeconds * this.timeScale);
    this.graphics.update(deltaSeconds * this.timeScale, this.targetTimeScale);
    this.render();
  };

  private countActiveUnits(): number {
    let active = 0;
    for (const unit of this.state.units.values()) {
      if (unit.orderQueue.length > 0) {
        active += 1;
        continue;
      }
      if (Math.abs(unit.velocity.x) > 0.015 || Math.abs(unit.velocity.y) > 0.015) {
        active += 1;
      }
    }
    return active;
  }

  private approach(current: number, target: number, maxDelta: number): number {
    if (maxDelta <= 0) {
      return target;
    }
    if (current < target) {
      return Math.min(current + maxDelta, target);
    }
    if (current > target) {
      return Math.max(current - maxDelta, target);
    }
    return target;
  }

  private stepSimulation(dt: number): void {
    if (this.mode === "singleplayer") {
      this.aiController?.update();
    }

    for (const unit of this.state.units.values()) {
      if (unit.orderQueue.length === 0) {
        const deceleration = (unit.definition.acceleration / this.state.tickRate) * dt * 0.75;
        unit.velocity.x = this.approach(unit.velocity.x, 0, deceleration);
        unit.velocity.y = this.approach(unit.velocity.y, 0, deceleration);
        if (Math.abs(unit.velocity.x) > 0.0001 || Math.abs(unit.velocity.y) > 0.0001) {
          unit.position.x += unit.velocity.x * dt;
          unit.position.y += unit.velocity.y * dt;
        } else {
          unit.velocity.x = 0;
          unit.velocity.y = 0;
        }
        continue;
      }
      const order = unit.orderQueue[0];
      switch (order.type) {
        case "escort":
          this.resolveEscort(unit, order, dt);
          break;
        case "patrol":
          this.resolvePatrol(unit, order, dt);
          break;
        case "move":
          this.resolveMove(unit, order, dt);
          break;
        default:
          unit.orderQueue.shift();
          break;
      }
    }
  }

  private resolveEscort(unit: UnitEntity, order: SimulationOrder, dt: number): void {
    if (!unit.escortTarget) {
      unit.orderQueue.shift();
      return;
    }
    const targetUnit = this.state.units.get(unit.escortTarget);
    if (!targetUnit) {
      unit.orderQueue.shift();
      return;
    }
    const targetPoint = {
      x: targetUnit.position.x - Math.cos(Math.PI / 4) * 0.6,
      y: targetUnit.position.y - Math.sin(Math.PI / 4) * 0.6
    };
    this.moveTowards(unit, targetPoint, dt, () => {
      unit.velocity.x *= 0.6;
      unit.velocity.y *= 0.6;
      order.metadata = order.metadata ?? {};
      order.metadata.index = 0;
    });
  }

  private resolveMove(unit: UnitEntity, order: SimulationOrder, dt: number): void {
    this.ensureQueue(order, this.asGrid(unit.position), (order.metadata?.path as Vector2[] | undefined) ?? []);
    this.advanceAlongQueue(unit, order, dt, () => {
      unit.orderQueue.shift();
    });
  }

  private resolvePatrol(unit: UnitEntity, order: SimulationOrder, dt: number): void {
    const metadata = this.ensureQueue(order, this.asGrid(unit.position), (order.metadata?.path as Vector2[] | undefined) ?? []);
    const direction = (metadata.direction as "forward" | "return" | undefined) ?? "forward";
    metadata.direction = direction;
    this.advanceAlongQueue(unit, order, dt, () => {
      if (direction === "forward") {
        const returnQueue = metadata.returnQueue as Vector2[] | undefined;
        if (!returnQueue || returnQueue.length === 0) {
          unit.orderQueue.shift();
          return;
        }
        metadata.queue = [...returnQueue];
        metadata.index = 0;
        metadata.direction = "return";
      } else {
        const forwardQueue = metadata.forwardQueue as Vector2[] | undefined;
        if (!forwardQueue || forwardQueue.length === 0) {
          unit.orderQueue.shift();
          return;
        }
        metadata.queue = [...forwardQueue];
        metadata.index = 0;
        metadata.direction = "forward";
      }
    });
  }

  private advanceAlongQueue(unit: UnitEntity, order: SimulationOrder, dt: number, onComplete: () => void): void {
    const metadata = (order.metadata ??= {});
    const queue = (metadata.queue as Vector2[] | undefined) ?? [];
    if (queue.length === 0) {
      onComplete();
      return;
    }
    const currentIndex = Math.min((metadata.index as number | undefined) ?? 0, queue.length - 1);
    const target = queue[currentIndex];
    this.moveTowards(unit, target, dt, () => {
      if (currentIndex >= queue.length - 1) {
        metadata.index = 0;
        onComplete();
      } else {
        metadata.index = currentIndex + 1;
      }
    });
  }

  private moveTowards(unit: UnitEntity, target: { x: number; y: number }, dt: number, onArrival: () => void): void {
    const dx = target.x - unit.position.x;
    const dy = target.y - unit.position.y;
    const distance = Math.hypot(dx, dy);
    const speedPerTick = unit.definition.maxSpeed / this.state.tickRate;
    const arrivalThreshold = Math.max(0.08, speedPerTick * dt * 1.25);
    if (distance < arrivalThreshold) {
      unit.position.x = target.x;
      unit.position.y = target.y;
      unit.velocity.x = 0;
      unit.velocity.y = 0;
      onArrival();
      return;
    }
    const directionX = dx / distance;
    const directionY = dy / distance;
    const desiredVelocityX = directionX * speedPerTick;
    const desiredVelocityY = directionY * speedPerTick;
    const accelerationPerTick = (unit.definition.acceleration / this.state.tickRate) * dt;
    unit.velocity.x = this.approach(unit.velocity.x, desiredVelocityX, accelerationPerTick);
    unit.velocity.y = this.approach(unit.velocity.y, desiredVelocityY, accelerationPerTick);
    unit.position.x += unit.velocity.x * dt;
    unit.position.y += unit.velocity.y * dt;
    if (Math.hypot(target.x - unit.position.x, target.y - unit.position.y) <= arrivalThreshold) {
      unit.position.x = target.x;
      unit.position.y = target.y;
      unit.velocity.x = 0;
      unit.velocity.y = 0;
      onArrival();
    }
  }

  private ensureQueue(order: SimulationOrder, startTile: Vector2, defaultPath: Vector2[]): Record<string, unknown> {
    const metadata = (order.metadata ??= {});
    let path = (metadata.path as Vector2[] | undefined) ?? defaultPath;
    const targetPoint = order.target as { x: number; y: number };
    const destinationTile = { x: Math.round(targetPoint.x), y: Math.round(targetPoint.y) };
    if (!path || path.length === 0) {
      path = findPath(this.state.map, startTile, destinationTile) ?? [];
      metadata.path = path;
    }
    if (!metadata.queue || (metadata.queue as Vector2[]).length === 0) {
      const queue = this.toQueue(path);
      metadata.queue = [...queue];
      if (order.type === "patrol") {
        metadata.forwardQueue = [...queue];
        const origin = (metadata.origin as Vector2 | undefined) ?? startTile;
        metadata.origin = origin;
        const returnPath =
          (metadata.returnPath as Vector2[] | undefined) ??
          findPath(this.state.map, destinationTile, origin) ??
          [...path].reverse();
        metadata.returnPath = returnPath;
        metadata.returnQueue = metadata.returnQueue ?? this.toQueue(returnPath);
      }
    }
    metadata.index = (metadata.index as number | undefined) ?? 0;
    return metadata;
  }

  private toQueue(path: Vector2[]): Vector2[] {
    if (path.length <= 1) {
      return path.map(tile => this.tileToWorld(tile));
    }
    const queue: Vector2[] = [];
    for (let i = 1; i < path.length; i += 1) {
      queue.push(this.tileToWorld(path[i]!));
    }
    return queue;
  }

  private tileToWorld(tile: Vector2): Vector2 {
    return { x: tile.x + 0.5, y: tile.y + 0.5 };
  }

  private attachPointerHandlers(): void {
    if (!this.app || !this.camera) return;
    const view = this.getCanvas();
    if (!view) return;
    view.addEventListener("contextmenu", (event: MouseEvent) => event.preventDefault());
    view.addEventListener("pointerdown", (event: PointerEvent) => {
      if (event.button === 0) {
        const point = this.camera?.screenToWorld(event);
        if (!point) return;
        this.pointerDown = { x: point.x / TILE_SIZE, y: point.y / TILE_SIZE };
        this.pointerDragActive = false;
      }
      if (event.button === 0 || event.button === 2) {
        this.camera?.notifyInteraction();
      }
    });
    view.addEventListener("pointermove", (event: PointerEvent) => {
      if (!this.pointerDown || !this.camera) return;
      const point = this.camera.screenToWorld(event);
      const current = { x: point.x / TILE_SIZE, y: point.y / TILE_SIZE };
      if (!this.pointerDragActive) {
        const dx = Math.abs(current.x - this.pointerDown.x);
        const dy = Math.abs(current.y - this.pointerDown.y);
        if (dx > SELECT_THRESHOLD / TILE_SIZE || dy > SELECT_THRESHOLD / TILE_SIZE) {
          this.pointerDragActive = true;
        }
      }
      if (this.pointerDragActive) {
        this.drawSelectionBox(this.pointerDown, current);
      }
    });
    view.addEventListener("pointerup", (event: PointerEvent) => {
      const worldPoint = this.camera?.screenToWorld(event);
      if (!worldPoint) return;
      const tilePoint = { x: worldPoint.x / TILE_SIZE, y: worldPoint.y / TILE_SIZE };
      if (event.button === 0) {
        const additive = event.shiftKey || event.metaKey || event.ctrlKey;
        const doubleClick = event.detail >= 2;
        this.handleSelect(tilePoint, {
          additive,
          doubleClick,
          fromDrag: this.pointerDragActive
        });
      } else if (event.button === 2) {
        const append = event.shiftKey || event.metaKey || event.ctrlKey;
        this.handleOrder(tilePoint, { append });
      }
      this.pointerDown = undefined;
      this.pointerDragActive = false;
      this.selectionBox.clear();
    });
    view.addEventListener("pointerleave", () => {
      this.pointerDown = undefined;
      this.pointerDragActive = false;
      this.selectionBox.clear();
    });
    view.addEventListener("pointercancel", () => {
      this.pointerDown = undefined;
      this.pointerDragActive = false;
      this.selectionBox.clear();
    });
  }

  private getCanvas(): HTMLCanvasElement | undefined {
    if (!this.app) return undefined;
    const { canvas, view } = this.app as unknown as {
      canvas?: HTMLCanvasElement;
      view?: HTMLCanvasElement;
    };
    return canvas ?? view;
  }

  private drawSelectionBox(start: Vector2, end: Vector2): void {
    const minX = Math.min(start.x, end.x) * TILE_SIZE;
    const minY = Math.min(start.y, end.y) * TILE_SIZE;
    const width = Math.abs(end.x - start.x) * TILE_SIZE;
    const height = Math.abs(end.y - start.y) * TILE_SIZE;
    this.selectionBox.clear();
    this.selectionBox.lineStyle({ width: 2, color: 0x7cf0ff, alpha: 0.8 });
    this.selectionBox.beginFill(0x4b9fff, 0.1);
    this.selectionBox.drawRect(minX, minY, width, height);
    this.selectionBox.endFill();
  }

  private handleSelect(
    tilePoint: Vector2,
    options: { additive: boolean; doubleClick: boolean; fromDrag: boolean }
  ): void {
    if (options.fromDrag && this.pointerDown) {
      const minX = Math.min(this.pointerDown.x, tilePoint.x);
      const minY = Math.min(this.pointerDown.y, tilePoint.y);
      const maxX = Math.max(this.pointerDown.x, tilePoint.x);
      const maxY = Math.max(this.pointerDown.y, tilePoint.y);
      const selected = [...this.state.units.values()].filter(unit => {
        if (unit.owner !== "player") return false;
        return (
          unit.position.x >= minX &&
          unit.position.x <= maxX &&
          unit.position.y >= minY &&
          unit.position.y <= maxY
        );
      });
      if (!selected.length) {
        if (!options.additive) {
          this.state.clearSelection();
          this.updateSelectionStatus();
        }
        return;
      }
      const mode = options.additive ? "add" : "replace";
      this.state.selectUnits(selected.map(unit => unit.id), mode);
      this.focusOnUnits(selected);
      this.updateSelectionStatus();
      this.pulseTempo(1800);
      return;
    }

    this.selectSingle(tilePoint, { additive: options.additive, doubleClick: options.doubleClick });
  }

  private selectSingle(tilePoint: Vector2, options: { additive: boolean; doubleClick: boolean }): void {
    const clicked = this.pickNearestUnit(tilePoint);
    if (!clicked) {
      if (!options.additive) {
        this.state.clearSelection();
        this.updateSelectionStatus();
      }
      return;
    }

    if (options.doubleClick) {
      const group = this.state.unitsByType(clicked.owner, clicked.type);
      const mode = options.additive ? "add" : "replace";
      this.state.selectUnits(group.map(unit => unit.id), mode);
      this.focusOnUnits(group);
      this.updateSelectionStatus();
      this.pulseTempo(2400);
      return;
    }

    if (options.additive) {
      if (clicked.selected) {
        this.state.selectUnits([clicked.id], "toggle");
        this.updateSelectionStatus();
        return;
      }
      this.state.selectUnits([clicked.id], "add");
      this.focusOnUnits([clicked]);
      this.updateSelectionStatus();
      this.pulseTempo(1600);
      return;
    }

    this.state.selectUnits([clicked.id], "replace");
    this.focusOnUnits([clicked]);
    this.updateSelectionStatus();
    this.pulseTempo(1600);
  }

  private focusOnUnits(units: UnitEntity[], immediate = false): void {
    if (!this.camera || units.length === 0) return;
    let sumX = 0;
    let sumY = 0;
    for (const unit of units) {
      sumX += unit.position.x;
      sumY += unit.position.y;
    }
    const centerX = (sumX / units.length) * TILE_SIZE;
    const centerY = (sumY / units.length) * TILE_SIZE;
    this.camera.focusOn({ x: centerX, y: centerY }, { immediate, soft: !immediate });
  }

  private handleOrder(tilePoint: Vector2, options: { append: boolean }): void {
    const selected = this.state.selectedUnits();
    if (selected.length === 0) return;
    const order = this.composeOrder(selected, tilePoint);
    if (!order) return;
    this.state.enqueueOrder(
      selected.map(unit => unit.id),
      order,
      { append: options.append }
    );
    const queue = order.metadata?.queue as Vector2[] | undefined;
    const path = order.metadata?.path as Vector2[] | undefined;
    this.debugPath = queue ?? (path ? path.map(tile => this.tileToWorld(tile)) : undefined);
    this.soundscape.playOrderConfirm();
    this.pulseTempo(options.append ? 1800 : 2600);
  }

  private composeOrder(units: UnitEntity[], targetPoint: Vector2): Order | undefined {
    const tile = {
      x: Math.max(0, Math.min(this.state.map.width - 1, Math.round(targetPoint.x))),
      y: Math.max(0, Math.min(this.state.map.height - 1, Math.round(targetPoint.y)))
    };
    switch (this.orderMode) {
      case "move": {
        const start = this.asGrid(units[0].position);
        const path = findPath(this.state.map, start, tile);
        if (!path) return undefined;
        const queue = this.toQueue(path);
        return {
          id: generateId(8),
          type: "move",
          target: { kind: "point", x: tile.x, y: tile.y },
          metadata: { path, queue }
        } satisfies Order;
      }
      case "patrol": {
        if (!this.pendingPatrol) {
          this.pendingPatrol = { origin: this.asGrid(targetPoint) };
          this.statusModeLabel &&
            (this.statusModeLabel.textContent = "Mode: Patrol — choose destination");
          return undefined;
        }
        const origin = this.pendingPatrol.origin;
        const pathForward = findPath(this.state.map, origin, tile);
        if (!pathForward) return undefined;
        const pathReturn = findPath(this.state.map, tile, origin) ?? [...pathForward].reverse();
        const forwardQueue = this.toQueue(pathForward);
        const returnQueue = this.toQueue(pathReturn);
        this.pendingPatrol = undefined;
        this.statusModeLabel &&
          (this.statusModeLabel.textContent = "Mode: Patrol");
        return {
          id: generateId(8),
          type: "patrol",
          target: { kind: "point", x: tile.x, y: tile.y },
          metadata: {
            origin,
            destination: tile,
            path: pathForward,
            returnPath: pathReturn,
            queue: [...forwardQueue],
            forwardQueue,
            returnQueue,
            direction: "forward"
          }
        } satisfies Order;
      }
      case "escort": {
        const nearest = this.pickNearestUnit(targetPoint, new Set(units.map(unit => unit.id)));
        if (!nearest) return undefined;
        return {
          id: generateId(8),
          type: "escort",
          target: { kind: "unit", unitId: nearest.id }
        } satisfies Order;
      }
      default:
        return undefined;
    }
  }

  private pickNearestUnit(point: Vector2, exclude: Set<number> = new Set()): UnitEntity | undefined {
    let best: UnitEntity | undefined;
    let distance = Number.POSITIVE_INFINITY;
    for (const unit of this.state.units.values()) {
      if (exclude.has(unit.id)) continue;
      if (unit.owner !== "player") continue;
      const d = Math.hypot(unit.position.x - point.x, unit.position.y - point.y);
      if (d < distance) {
        best = unit;
        distance = d;
      }
    }
    return best;
  }

  private asGrid(point: Vector2): Vector2 {
    return { x: Math.round(point.x), y: Math.round(point.y) };
  }

  private render(): void {
    const units = [...this.state.units.values()];
    const selectionPulse = this.graphics.getSelectionPulse();
    this.renderer.updateUnits(units, selectionPulse);
    this.renderer.renderSelections(units, selectionPulse);
    this.renderer.renderDebugPath(this.debugPath);
    this.renderer.renderStrategic(this.state.getRenderableLogistics());
  }

  private updateSelectionStatus(): void {
    const label = this.statusSelectionLabel;
    if (!label) return;
    const selected = this.state.selectedUnits();
    if (selected.length === 0) {
      label.textContent = "No units selected";
    } else {
      label.textContent = `${selected.length} unit${selected.length > 1 ? "s" : ""} selected`;
    }
  }

  private updateStrategicHud(): void {
    const overview = this.state.getStrategicOverview("player");
    if (this.islandStatusList) {
      this.islandStatusList.innerHTML = overview.islands
        .map(island => {
          const pressure = island.pressure.toFixed(1).padStart(4, " ");
          const target = island.targetPressure.toFixed(0).padStart(3, " ");
          const supply = island.supply.toFixed(1);
          const storage = island.storage.toFixed(1);
          return `<li><span class="label">${island.name}</span><span class="value">${pressure}% → ${target}%</span><span class="value">${supply}/${storage}t</span></li>`;
        })
        .join("");
    }
    if (this.convoyStatusList) {
      this.convoyStatusList.innerHTML = overview.convoys
        .map(convoy => {
          const penalty = Math.round(convoy.weatherPenalty * 100);
          const status = convoy.disrupted ? "RAIDED" : "Clear";
          return `<li class="${convoy.disrupted ? "warning" : "ok"}"><span class="label">${convoy.id}</span><span class="value">${status}</span><span class="value">Wx ${penalty}%</span></li>`;
        })
        .join("");
    }
  }

  private handleEvents(events: GameEvent[]): void {
    if (!events.length) return;
    for (const event of events) {
      switch (event.type) {
        case "convoyDisrupted":
          this.statusLogisticsLabel &&
            (this.statusLogisticsLabel.textContent = `Alert: Convoy ${event.convoyId} under attack!`);
          this.soundscape.playAlert();
          this.pulseTempo(2600);
          break;
        case "convoyRestored":
          this.statusLogisticsLabel &&
            (this.statusLogisticsLabel.textContent = `Convoy ${event.convoyId} back online.`);
          this.soundscape.playRecovery();
          this.pulseTempo(1800);
          break;
        case "convoyDelivered":
          this.statusLogisticsLabel &&
            (this.statusLogisticsLabel.textContent = `Supplies delivered via ${event.convoyId}.`);
          this.soundscape.playDelivery();
          this.pulseTempo(1800);
          break;
        case "islandCritical":
          this.statusLogisticsLabel &&
            (this.statusLogisticsLabel.textContent = `Critical pressure at ${event.islandId}!`);
          this.soundscape.playAlert();
          this.pulseTempo(3000);
          break;
        default:
          break;
      }
    }
  }
}
