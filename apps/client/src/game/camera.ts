import type { Container, IPointData } from "pixi.js";
import { Point } from "pixi.js";

export interface CameraOptions {
  view: HTMLCanvasElement;
  world: Container;
  minZoom?: number;
  maxZoom?: number;
}

export class CameraController {
  private readonly view: HTMLCanvasElement;
  private readonly world: Container;
  private readonly minZoom: number;
  private readonly maxZoom: number;
  private isDragging = false;
  private lastPointer?: IPointData;
  private readonly keys = new Set<string>();
  private panVelocity = new Point(0, 0);
  private focusTarget?: Point;
  private viewSize = { width: 0, height: 0 };
  private readonly pointerDownHandler: (event: PointerEvent) => void;
  private readonly pointerMoveHandler: (event: PointerEvent) => void;
  private readonly pointerUpHandler: (event: PointerEvent) => void;
  private readonly wheelHandler: (event: WheelEvent) => void;
  private readonly keyDownHandler: (event: KeyboardEvent) => void;
  private readonly keyUpHandler: (event: KeyboardEvent) => void;
  private readonly blurHandler: () => void;

  constructor(options: CameraOptions) {
    this.view = options.view;
    this.world = options.world;
    this.minZoom = options.minZoom ?? 0.4;
    this.maxZoom = options.maxZoom ?? 1.8;
    this.viewSize = { width: this.view.width, height: this.view.height };

    this.pointerDownHandler = this.handlePointerDown.bind(this);
    this.pointerMoveHandler = this.handlePointerMove.bind(this);
    this.pointerUpHandler = this.handlePointerUp.bind(this);
    this.wheelHandler = this.handleWheel.bind(this);
    this.keyDownHandler = this.handleKeyDown.bind(this);
    this.keyUpHandler = this.handleKeyUp.bind(this);
    this.blurHandler = () => {
      this.keys.clear();
      this.panVelocity.set(0, 0);
    };

    this.bindEvents();
  }

  private bindEvents(): void {
    this.view.addEventListener("pointerdown", this.pointerDownHandler);
    this.view.addEventListener("pointermove", this.pointerMoveHandler);
    this.view.addEventListener("pointerup", this.pointerUpHandler);
    this.view.addEventListener("pointercancel", this.pointerUpHandler);
    this.view.addEventListener("wheel", this.wheelHandler, { passive: false });
    window.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("keyup", this.keyUpHandler);
    window.addEventListener("blur", this.blurHandler);
  }

  private handlePointerDown(event: PointerEvent): void {
    if (event.button !== 1) {
      return;
    }
    this.isDragging = true;
    this.lastPointer = new Point(event.clientX, event.clientY);
    this.view.setPointerCapture(event.pointerId);
    this.focusTarget = undefined;
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.isDragging || !this.lastPointer) {
      return;
    }
    const dx = event.clientX - this.lastPointer.x;
    const dy = event.clientY - this.lastPointer.y;
    this.world.position.x += dx;
    this.world.position.y += dy;
    this.lastPointer = new Point(event.clientX, event.clientY);
  }

  private handlePointerUp(event: PointerEvent): void {
    if (event.button !== 1 && event.type !== "pointercancel") {
      return;
    }
    this.isDragging = false;
    this.lastPointer = undefined;
    try {
      this.view.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore release errors when the pointer is already released.
    }
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    const direction = Math.sign(event.deltaY);
    const zoomFactor = direction > 0 ? 0.92 : 1.08;
    const newScale = Math.min(this.maxZoom, Math.max(this.minZoom, this.world.scale.x * zoomFactor));
    const before = this.screenToWorld(new Point(event.offsetX, event.offsetY));
    this.world.scale.set(newScale);
    const after = this.screenToWorld(new Point(event.offsetX, event.offsetY));
    this.world.position.x += (before.x - after.x) * newScale;
    this.world.position.y += (before.y - after.y) * newScale;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    this.keys.add(event.code);
    if (event.code === "Space") {
      event.preventDefault();
    }
    this.focusTarget = undefined;
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.code);
    if (event.code === "Space") {
      event.preventDefault();
    }
  }

  screenToWorld(point: IPointData): Point {
    const invScale = 1 / this.world.scale.x;
    return new Point((point.x - this.world.position.x) * invScale, (point.y - this.world.position.y) * invScale);
  }

  update(deltaSeconds: number): void {
    const speed = 520 / Math.max(0.0001, this.world.scale.x);
    const horizontal = (this.keys.has("ArrowRight") || this.keys.has("KeyD"))
      ? 1
      : (this.keys.has("ArrowLeft") || this.keys.has("KeyA"))
        ? -1
        : 0;
    const vertical = (this.keys.has("ArrowDown") || this.keys.has("KeyS"))
      ? 1
      : (this.keys.has("ArrowUp") || this.keys.has("KeyW"))
        ? -1
        : 0;

    const targetVelocityX = horizontal * speed;
    const targetVelocityY = vertical * speed;
    const smoothing = 1 - Math.exp(-deltaSeconds * 7);
    this.panVelocity.x += (targetVelocityX - this.panVelocity.x) * smoothing;
    this.panVelocity.y += (targetVelocityY - this.panVelocity.y) * smoothing;
    if (Math.abs(this.panVelocity.x) < 0.5) this.panVelocity.x = 0;
    if (Math.abs(this.panVelocity.y) < 0.5) this.panVelocity.y = 0;
    this.world.position.x += this.panVelocity.x * deltaSeconds;
    this.world.position.y += this.panVelocity.y * deltaSeconds;

    if (this.focusTarget) {
      const dx = this.focusTarget.x - this.world.position.x;
      const dy = this.focusTarget.y - this.world.position.y;
      const focusSmoothing = 1 - Math.exp(-deltaSeconds * 4.5);
      this.world.position.x += dx * focusSmoothing;
      this.world.position.y += dy * focusSmoothing;
      if (Math.hypot(dx, dy) < 1) {
        this.world.position.copyFrom(this.focusTarget);
        this.focusTarget = undefined;
      }
    }
  }

  focusOn(point: IPointData, options: { immediate?: boolean; soft?: boolean } = {}): void {
    const target = this.getTargetPosition(point);
    if (options.immediate) {
      this.focusTarget = undefined;
      this.world.position.copyFrom(target);
      this.panVelocity.set(0, 0);
      return;
    }
    if (options.soft) {
      this.focusTarget = undefined;
      this.world.position.x += (target.x - this.world.position.x) * 0.35;
      this.world.position.y += (target.y - this.world.position.y) * 0.35;
      return;
    }
    this.focusTarget = target;
  }

  notifyInteraction(): void {
    this.focusTarget = undefined;
  }

  syncViewport(): void {
    this.viewSize = { width: this.view.width, height: this.view.height };
  }

  destroy(): void {
    this.view.removeEventListener("pointerdown", this.pointerDownHandler);
    this.view.removeEventListener("pointermove", this.pointerMoveHandler);
    this.view.removeEventListener("pointerup", this.pointerUpHandler);
    this.view.removeEventListener("pointercancel", this.pointerUpHandler);
    this.view.removeEventListener("wheel", this.wheelHandler);
    window.removeEventListener("keydown", this.keyDownHandler);
    window.removeEventListener("keyup", this.keyUpHandler);
    window.removeEventListener("blur", this.blurHandler);
    this.keys.clear();
  }

  private getTargetPosition(point: IPointData): Point {
    const centerX = (this.viewSize.width || this.view.width) / 2;
    const centerY = (this.viewSize.height || this.view.height) / 2;
    return new Point(centerX - point.x * this.world.scale.x, centerY - point.y * this.world.scale.y);
  }
}
