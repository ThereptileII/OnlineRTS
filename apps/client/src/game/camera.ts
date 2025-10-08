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

  constructor(options: CameraOptions) {
    this.view = options.view;
    this.world = options.world;
    this.minZoom = options.minZoom ?? 0.4;
    this.maxZoom = options.maxZoom ?? 1.8;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.view.addEventListener("pointerdown", event => {
      if (event.button !== 1) {
        return;
      }
      this.isDragging = true;
      this.lastPointer = new Point(event.clientX, event.clientY);
      this.view.setPointerCapture(event.pointerId);
    });

    this.view.addEventListener("pointermove", event => {
      if (!this.isDragging || !this.lastPointer) {
        return;
      }
      const dx = event.clientX - this.lastPointer.x;
      const dy = event.clientY - this.lastPointer.y;
      this.world.position.x += dx;
      this.world.position.y += dy;
      this.lastPointer = new Point(event.clientX, event.clientY);
    });

    this.view.addEventListener("pointerup", event => {
      if (event.button !== 1) {
        return;
      }
      this.isDragging = false;
      this.lastPointer = undefined;
      this.view.releasePointerCapture(event.pointerId);
    });

    this.view.addEventListener("wheel", event => {
      event.preventDefault();
      const direction = Math.sign(event.deltaY);
      const zoomFactor = direction > 0 ? 0.92 : 1.08;
      const newScale = Math.min(this.maxZoom, Math.max(this.minZoom, this.world.scale.x * zoomFactor));
      const before = this.screenToWorld(new Point(event.offsetX, event.offsetY));
      this.world.scale.set(newScale);
      const after = this.screenToWorld(new Point(event.offsetX, event.offsetY));
      this.world.position.x += (before.x - after.x) * newScale;
      this.world.position.y += (before.y - after.y) * newScale;
    });
  }

  screenToWorld(point: IPointData): Point {
    const invScale = 1 / this.world.scale.x;
    return new Point((point.x - this.world.position.x) * invScale, (point.y - this.world.position.y) * invScale);
  }
}
