import { findPath, TILE_SIZE, createSkirmishMap, createId } from "../../../packages/shared/index.js";
import { GameState } from "./state.js";
import { CameraController } from "./camera.js";
import { MapRenderer } from "./renderer.js";

const SELECT_THRESHOLD = 4;

export class Game {
  constructor(options) {
    if (!options.container) {
      throw new Error("Game container not provided");
    }
    this.container = options.container;
    this.state = new GameState({
      map: createSkirmishMap(),
      tickRate: 30
    });
    this.renderer = new MapRenderer(this.state.map);
    this.orderMode = "move";
    this.pendingPatrol = null;
    this.pointerDown = null;
    this.pointerCurrent = null;
    this.debugPath = null;
    this.statusModeLabel = null;
    this.statusSelectionLabel = null;
    this.animationFrame = null;
    this.lastTimestamp = null;
    this.handleResize = () => this.resize();
    this.bootstrapUi();
    this.spawnInitialUnits();
  }

  bootstrapUi() {
    const moveButton = document.getElementById("order-move");
    const patrolButton = document.getElementById("order-patrol");
    const escortButton = document.getElementById("order-escort");
    this.statusModeLabel = document.getElementById("status-mode");
    this.statusSelectionLabel = document.getElementById("status-selection");

    const setMode = mode => {
      this.orderMode = mode;
      for (const button of [moveButton, patrolButton, escortButton]) {
        button?.classList.toggle("active", button?.id === `order-${mode}`);
      }
      if (this.statusModeLabel) {
        this.statusModeLabel.textContent = `Mode: ${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;
      }
      this.pendingPatrol = null;
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

  spawnInitialUnits() {
    const spawnpoints = [
      { type: "sloop", position: { x: 3.5, y: 12.5 } },
      { type: "corvette", position: { x: 5, y: 13.5 } },
      { type: "transport", position: { x: 4.2, y: 15 } },
      { type: "sloop", position: { x: 14, y: 4.5 } },
      { type: "corvette", position: { x: 16, y: 4 } }
    ];
    for (const spawn of spawnpoints) {
      this.state.createUnit(spawn.type, spawn.position);
    }
  }

  start() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      throw new Error("Unable to create 2D context");
    }
    this.container.appendChild(this.canvas);
    this.resize();
    this.camera = new CameraController({
      view: this.canvas,
      worldWidth: this.state.map.width * TILE_SIZE,
      worldHeight: this.state.map.height * TILE_SIZE
    });
    window.addEventListener("resize", this.handleResize);
    this.attachPointerHandlers();
    this.lastTimestamp = performance.now();
    const step = timestamp => {
      const elapsed = timestamp - this.lastTimestamp;
      this.lastTimestamp = timestamp;
      const dt = elapsed / (1000 / this.state.tickRate);
      this.state.tick += dt;
      this.stepSimulation(dt);
      this.render();
      this.animationFrame = requestAnimationFrame(step);
    };
    this.animationFrame = requestAnimationFrame(step);
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    window.removeEventListener("resize", this.handleResize);
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.camera) {
      this.camera.resize(this.canvas.width, this.canvas.height);
    }
  }

  stepSimulation(dt) {
    for (const unit of this.state.units.values()) {
      if (unit.orderQueue.length === 0) {
        unit.velocity.x *= 0.8;
        unit.velocity.y *= 0.8;
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

  resolveEscort(unit, order, dt) {
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

  resolveMove(unit, order, dt) {
    const metadata = this.ensureQueue(order, this.asGrid(unit.position), order.metadata?.path ?? []);
    this.advanceAlongQueue(unit, order, dt, () => {
      unit.orderQueue.shift();
      metadata.index = 0;
    });
  }

  resolvePatrol(unit, order, dt) {
    const metadata = this.ensureQueue(order, this.asGrid(unit.position), order.metadata?.path ?? []);
    const direction = metadata.direction ?? "forward";
    metadata.direction = direction;
    this.advanceAlongQueue(unit, order, dt, () => {
      if (direction === "forward") {
        const returnQueue = metadata.returnQueue ?? [];
        if (returnQueue.length === 0) {
          unit.orderQueue.shift();
          return;
        }
        metadata.queue = [...returnQueue];
        metadata.index = 0;
        metadata.direction = "return";
      } else {
        const forwardQueue = metadata.forwardQueue ?? [];
        if (forwardQueue.length === 0) {
          unit.orderQueue.shift();
          return;
        }
        metadata.queue = [...forwardQueue];
        metadata.index = 0;
        metadata.direction = "forward";
      }
    });
  }

  advanceAlongQueue(unit, order, dt, onComplete) {
    const metadata = (order.metadata ??= {});
    const queue = metadata.queue ?? [];
    if (queue.length === 0) {
      onComplete();
      return;
    }
    const currentIndex = Math.min(metadata.index ?? 0, queue.length - 1);
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

  moveTowards(unit, target, dt, onArrival) {
    const dx = target.x - unit.position.x;
    const dy = target.y - unit.position.y;
    const distance = Math.hypot(dx, dy);
    const arrivalThreshold = 0.1;
    if (distance < arrivalThreshold) {
      unit.position.x = target.x;
      unit.position.y = target.y;
      onArrival();
      return;
    }
    const directionX = dx / distance;
    const directionY = dy / distance;
    const speedPerTick = unit.definition.maxSpeed / this.state.tickRate;
    const delta = speedPerTick * dt;
    unit.velocity.x = directionX * delta;
    unit.velocity.y = directionY * delta;
    unit.position.x += unit.velocity.x;
    unit.position.y += unit.velocity.y;
  }

  ensureQueue(order, startTile, defaultPath) {
    const metadata = (order.metadata ??= {});
    let path = metadata.path ?? defaultPath;
    const targetPoint = order.target;
    const destinationTile = { x: Math.round(targetPoint.x), y: Math.round(targetPoint.y) };
    if (!path || path.length === 0) {
      path = findPath(this.state.map, startTile, destinationTile) ?? [];
      metadata.path = path;
    }
    if (!metadata.queue || metadata.queue.length === 0) {
      const queue = this.toQueue(path);
      metadata.queue = [...queue];
      if (order.type === "patrol") {
        metadata.forwardQueue = [...queue];
        const origin = metadata.origin ?? startTile;
        metadata.origin = origin;
        const returnPath =
          metadata.returnPath ?? findPath(this.state.map, destinationTile, origin) ?? [...path].reverse();
        metadata.returnPath = returnPath;
        metadata.returnQueue = metadata.returnQueue ?? this.toQueue(returnPath);
      }
    }
    metadata.index = metadata.index ?? 0;
    return metadata;
  }

  toQueue(path) {
    if (path.length <= 1) {
      return path.map(tile => this.tileToWorld(tile));
    }
    const queue = [];
    for (let i = 1; i < path.length; i += 1) {
      queue.push(this.tileToWorld(path[i]));
    }
    return queue;
  }

  tileToWorld(tile) {
    return { x: tile.x + 0.5, y: tile.y + 0.5 };
  }

  attachPointerHandlers() {
    if (!this.canvas || !this.camera) return;
    const view = this.canvas;
    view.addEventListener("contextmenu", event => event.preventDefault());
    view.addEventListener("pointerdown", event => {
      if (event.button === 0) {
        const point = this.camera.screenToWorld({ x: event.offsetX, y: event.offsetY });
        this.pointerDown = { x: point.x / TILE_SIZE, y: point.y / TILE_SIZE };
        this.pointerCurrent = { ...this.pointerDown };
      }
    });
    view.addEventListener("pointermove", event => {
      if (!this.pointerDown || !this.camera) return;
      const point = this.camera.screenToWorld({ x: event.offsetX, y: event.offsetY });
      this.pointerCurrent = { x: point.x / TILE_SIZE, y: point.y / TILE_SIZE };
    });
    view.addEventListener("pointerup", event => {
      if (!this.camera) return;
      const worldPoint = this.camera.screenToWorld({ x: event.offsetX, y: event.offsetY });
      const tilePoint = { x: worldPoint.x / TILE_SIZE, y: worldPoint.y / TILE_SIZE };
      if (event.button === 0) {
        this.handleSelect(tilePoint);
      } else if (event.button === 2) {
        this.handleOrder(tilePoint);
      }
      this.pointerDown = null;
      this.pointerCurrent = null;
    });
    view.addEventListener("pointerleave", () => {
      this.pointerDown = null;
      this.pointerCurrent = null;
    });
  }

  handleSelect(tilePoint) {
    if (!this.pointerDown) {
      this.selectSingle(tilePoint);
      return;
    }
    const dx = Math.abs(tilePoint.x - this.pointerDown.x) * TILE_SIZE;
    const dy = Math.abs(tilePoint.y - this.pointerDown.y) * TILE_SIZE;
    if (dx < SELECT_THRESHOLD && dy < SELECT_THRESHOLD) {
      this.selectSingle(tilePoint);
      return;
    }
    const minX = Math.min(this.pointerDown.x, tilePoint.x);
    const minY = Math.min(this.pointerDown.y, tilePoint.y);
    const maxX = Math.max(this.pointerDown.x, tilePoint.x);
    const maxY = Math.max(this.pointerDown.y, tilePoint.y);
    const selected = [...this.state.units.values()].filter(unit => {
      return unit.position.x >= minX && unit.position.x <= maxX && unit.position.y >= minY && unit.position.y <= maxY;
    });
    this.state.clearSelection();
    this.state.selectUnits(selected.map(unit => unit.id));
    this.updateSelectionStatus();
  }

  selectSingle(tilePoint) {
    let closest;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const unit of this.state.units.values()) {
      const distance = Math.hypot(unit.position.x - tilePoint.x, unit.position.y - tilePoint.y);
      if (distance < 0.6 && distance < closestDistance) {
        closest = unit;
        closestDistance = distance;
      }
    }
    if (!closest) {
      this.state.clearSelection();
    } else {
      this.state.selectUnits([closest.id]);
    }
    this.updateSelectionStatus();
  }

  handleOrder(tilePoint) {
    const selected = this.state.selectedUnits();
    if (selected.length === 0) return;
    const order = this.composeOrder(selected, tilePoint);
    if (!order) return;
    this.state.enqueueOrder(
      selected.map(unit => unit.id),
      order
    );
    this.debugPath = order.metadata?.path ? [...order.metadata.path] : undefined;
  }

  composeOrder(units, targetPoint) {
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
          id: createId(8),
          type: "move",
          target: { kind: "point", x: tile.x, y: tile.y },
          metadata: { path, queue }
        };
      }
      case "patrol": {
        if (!this.pendingPatrol) {
          this.pendingPatrol = { origin: this.asGrid(targetPoint) };
          if (this.statusModeLabel) {
            this.statusModeLabel.textContent = "Mode: Patrol — choose destination";
          }
          return undefined;
        }
        const origin = this.pendingPatrol.origin;
        const pathForward = findPath(this.state.map, origin, tile);
        if (!pathForward) return undefined;
        const pathReturn = findPath(this.state.map, tile, origin) ?? [...pathForward].reverse();
        const forwardQueue = this.toQueue(pathForward);
        const returnQueue = this.toQueue(pathReturn);
        this.pendingPatrol = null;
        if (this.statusModeLabel) {
          this.statusModeLabel.textContent = "Mode: Patrol";
        }
        return {
          id: createId(8),
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
        };
      }
      case "escort": {
        const exclude = new Set(units.map(unit => unit.id));
        const nearest = this.pickNearestUnit(targetPoint, exclude);
        if (!nearest) return undefined;
        return {
          id: createId(8),
          type: "escort",
          target: { kind: "unit", unitId: nearest.id }
        };
      }
      default:
        return undefined;
    }
  }

  pickNearestUnit(point, exclude = new Set()) {
    let best;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const unit of this.state.units.values()) {
      if (exclude.has(unit.id)) continue;
      const d = Math.hypot(unit.position.x - point.x, unit.position.y - point.y);
      if (d < bestDistance) {
        best = unit;
        bestDistance = d;
      }
    }
    return best;
  }

  asGrid(point) {
    return { x: Math.round(point.x), y: Math.round(point.y) };
  }

  render() {
    if (!this.ctx || !this.canvas || !this.camera) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.camera.applyTransform(ctx);
    this.renderer.drawTerrain(ctx);
    this.renderer.drawDebugPath(ctx, this.debugPath);
    const units = [...this.state.units.values()];
    this.renderer.drawUnits(ctx, units);
    this.renderer.drawSelections(ctx, units);
    if (this.pointerDown && this.pointerCurrent) {
      this.drawSelectionRect(ctx, this.pointerDown, this.pointerCurrent);
    }
    ctx.restore();
  }

  drawSelectionRect(ctx, start, end) {
    const minX = Math.min(start.x, end.x) * TILE_SIZE;
    const minY = Math.min(start.y, end.y) * TILE_SIZE;
    const width = Math.abs(end.x - start.x) * TILE_SIZE;
    const height = Math.abs(end.y - start.y) * TILE_SIZE;
    ctx.save();
    ctx.lineWidth = 2 / this.camera.scale;
    ctx.strokeStyle = "rgba(124, 240, 255, 0.8)";
    ctx.fillStyle = "rgba(75, 159, 255, 0.1)";
    ctx.beginPath();
    ctx.rect(minX, minY, width, height);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  updateSelectionStatus() {
    const label = this.statusSelectionLabel;
    if (!label) return;
    const selected = this.state.selectedUnits();
    if (selected.length === 0) {
      label.textContent = "No units selected";
    } else {
      label.textContent = `${selected.length} unit${selected.length > 1 ? "s" : ""} selected`;
    }
  }
}
