/**
 * Module-level cache for satellite HTMLCanvasElement objects.
 * Avoids canvas.toDataURL() which throws SecurityError when tiles are CORS-cached.
 * The canvas can be used directly for WebGL texImage2D without CORS restrictions.
 */

let _cachedCanvas: HTMLCanvasElement | null = null;

export function cacheCanvas(canvas: HTMLCanvasElement): void {
  _cachedCanvas = canvas;
}

export function getCachedCanvas(): HTMLCanvasElement | null {
  return _cachedCanvas;
}

export function clearCanvas(): void {
  _cachedCanvas = null;
}
