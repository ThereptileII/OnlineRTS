import { BLEND_MODES, ColorMatrixFilter, Container, Graphics } from "pixi.js";

interface ViewportSize {
  width: number;
  height: number;
}

interface FocusOptions {
  immediate?: boolean;
  soft?: boolean;
}

export class GraphicsEngine {
  private readonly root = new Container();
  private readonly backgroundLayer = new Graphics();
  private readonly waveLayer = new Graphics();
  private readonly shimmerLayer = new Graphics();
  private readonly vignetteLayer = new Graphics();
  private readonly colorFilter = new ColorMatrixFilter();
  private viewport: ViewportSize = { width: 1, height: 1 };
  private elapsed = 0;
  private world?: Container;

  constructor() {
    this.root.sortableChildren = true;
    this.shimmerLayer.blendMode = BLEND_MODES.ADD;
    this.root.addChild(this.backgroundLayer);
    this.root.addChild(this.waveLayer);
    this.root.addChild(this.shimmerLayer);
    this.root.addChild(this.vignetteLayer);
    this.colorFilter.brightness(1.08, false);
    this.colorFilter.saturate(0.12, false);
  }

  mount(stage: Container): void {
    if (!stage.children.includes(this.root)) {
      stage.addChildAt(this.root, 0);
    }
  }

  setWorld(world: Container): void {
    if (this.world && this.world.parent === this.root) {
      this.root.removeChild(this.world);
    }
    this.world = world;
    this.world.filters = [this.colorFilter];
    const insertIndex = Math.min(2, this.root.children.length);
    this.root.addChildAt(world, insertIndex);
  }

  resize(width: number, height: number): void {
    this.viewport = { width, height };
    this.drawBackdrop();
    this.drawVignette();
  }

  update(deltaSeconds: number, intensity = 1): void {
    this.elapsed += deltaSeconds;
    this.drawWaves(intensity);
    this.drawShimmer(intensity);
  }

  getSelectionPulse(): number {
    return 0.18 + Math.sin(this.elapsed * 2.2) * 0.08;
  }

  focusOn(point: { x: number; y: number }, options: FocusOptions = {}): void {
    if (!this.world) return;
    const { immediate, soft } = options;
    const centerX = this.viewport.width / 2;
    const centerY = this.viewport.height / 2;
    const targetX = centerX - point.x * this.world.scale.x;
    const targetY = centerY - point.y * this.world.scale.y;
    if (immediate) {
      this.world.position.set(targetX, targetY);
      return;
    }
    if (soft) {
      this.world.position.x += (targetX - this.world.position.x) * 0.1;
      this.world.position.y += (targetY - this.world.position.y) * 0.1;
      return;
    }
    this.world.position.set(targetX, targetY);
  }

  detach(): void {
    if (this.world) {
      this.world.filters = [];
      if (this.world.parent === this.root) {
        this.root.removeChild(this.world);
      }
      this.world = undefined;
    }
    if (this.root.parent) {
      this.root.parent.removeChild(this.root);
    }
  }

  destroy(): void {
    this.detach();
    this.backgroundLayer.destroy();
    this.waveLayer.destroy();
    this.shimmerLayer.destroy();
    this.vignetteLayer.destroy();
    this.root.destroy({ children: false });
  }

  private drawBackdrop(): void {
    const { width, height } = this.viewport;
    this.backgroundLayer.clear();
    this.backgroundLayer.beginFill(0x010b16);
    this.backgroundLayer.drawRect(-200, -200, width + 400, height + 400);
    this.backgroundLayer.endFill();
    this.backgroundLayer.beginFill(0x08203a, 0.45);
    this.backgroundLayer.drawRect(-200, height * 0.45, width + 400, height + 400);
    this.backgroundLayer.endFill();
  }

  private drawVignette(): void {
    const { width, height } = this.viewport;
    this.vignetteLayer.clear();
    const thickness = Math.max(48, Math.min(width, height) * 0.08);
    this.vignetteLayer.beginFill(0x000000, 0.32);
    this.vignetteLayer.drawRect(-thickness, -thickness, width + thickness * 2, thickness);
    this.vignetteLayer.drawRect(-thickness, height, width + thickness * 2, thickness);
    this.vignetteLayer.drawRect(-thickness, 0, thickness, height);
    this.vignetteLayer.drawRect(width, 0, thickness, height);
    this.vignetteLayer.endFill();
  }

  private drawWaves(intensity: number): void {
    const { width, height } = this.viewport;
    this.waveLayer.clear();
    const bands = 6;
    for (let i = 0; i < bands; i += 1) {
      const phase = this.elapsed * (0.5 + i * 0.12) + i * 1.2;
      const offset = Math.sin(phase) * 18 * intensity;
      const y = (height / bands) * i + offset;
      const alpha = 0.05 + i * 0.035;
      this.waveLayer.beginFill(0x0b3558, alpha);
      this.waveLayer.drawRect(-120, y, width + 240, 26 + i * 4);
      this.waveLayer.endFill();
    }
  }

  private drawShimmer(intensity: number): void {
    const { width, height } = this.viewport;
    this.shimmerLayer.clear();
    const sparks = 3;
    for (let i = 0; i < sparks; i += 1) {
      const phase = this.elapsed * (1.2 + i * 0.2) + i * 2.1;
      const x = width * (0.25 + 0.3 * i) + Math.sin(phase) * (width * 0.12);
      const y = height * 0.35 + Math.cos(phase * 0.8) * height * 0.15;
      const radius = 90 + Math.sin(phase * 1.2) * 28;
      const alpha = 0.045 * intensity + (0.02 * (i + 1)) / sparks;
      this.shimmerLayer.beginFill(0x12a0ff, alpha);
      this.shimmerLayer.drawCircle(x, y, radius);
      this.shimmerLayer.endFill();
    }
  }
}
