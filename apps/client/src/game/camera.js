export class CameraController {
  constructor({ view, worldWidth, worldHeight, minZoom = 0.5, maxZoom = 2 }) {
    this.view = view;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.lastPointer = null;
    this.resize(view.width, view.height);
    this.bindEvents();
  }

  bindEvents() {
    this.view.addEventListener("pointerdown", event => {
      if (event.button !== 1) return;
      this.isDragging = true;
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.view.setPointerCapture(event.pointerId);
    });

    this.view.addEventListener("pointermove", event => {
      if (!this.isDragging || !this.lastPointer) return;
      const dx = event.clientX - this.lastPointer.x;
      const dy = event.clientY - this.lastPointer.y;
      this.offsetX += dx;
      this.offsetY += dy;
      this.lastPointer = { x: event.clientX, y: event.clientY };
    });

    const stopDragging = event => {
      if (event.button !== 1) return;
      this.isDragging = false;
      this.lastPointer = null;
      this.view.releasePointerCapture(event.pointerId);
    };

    this.view.addEventListener("pointerup", stopDragging);
    this.view.addEventListener("pointerleave", () => {
      this.isDragging = false;
      this.lastPointer = null;
    });

    this.view.addEventListener("wheel", event => {
      event.preventDefault();
      const direction = Math.sign(event.deltaY);
      const zoomFactor = direction > 0 ? 0.9 : 1.1;
      const newScale = Math.min(this.maxZoom, Math.max(this.minZoom, this.scale * zoomFactor));
      const before = this.screenToWorld({ x: event.offsetX, y: event.offsetY });
      this.scale = newScale;
      const after = this.screenToWorld({ x: event.offsetX, y: event.offsetY });
      this.offsetX += (before.x - after.x) * this.scale;
      this.offsetY += (before.y - after.y) * this.scale;
    });
  }

  resize(width, height) {
    this.view.width = width;
    this.view.height = height;
    const worldPixelWidth = this.worldWidth;
    const worldPixelHeight = this.worldHeight;
    this.offsetX = width / 2 - (worldPixelWidth * this.scale) / 2;
    this.offsetY = height / 2 - (worldPixelHeight * this.scale) / 2;
  }

  applyTransform(ctx) {
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);
  }

  screenToWorld(point) {
    const invScale = 1 / this.scale;
    return {
      x: (point.x - this.offsetX) * invScale,
      y: (point.y - this.offsetY) * invScale
    };
  }
}
