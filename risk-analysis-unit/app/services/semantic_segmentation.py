"""
Semantic Segmentation Service
==============================
Server-side satellite image segmentation using pixel color-space heuristics.

Each image is broken into NxN tiles. Each tile's average RGB is classified
into one of 10 land-use categories using channel-ratio rules and brightness
thresholds — no GPU or heavy model required.

Classes:
  0  UNKNOWN
  1  VEGETATION  — green (parks, forest, fields)
  2  WATER       — blue (rivers, sea, lakes)
  3  ROAD        — gray asphalt
  4  BUILDING_LOW  — dark, low residential
  5  BUILDING_HIGH — very dark, commercial tower shadow
  6  BRIDGE      — warm amber
  7  BARE_GROUND — tan/brown exposed soil
  8  SLUM        — brick red-orange informal settlement
  9  SPORTS      — lime green stadium / pitch
"""

from __future__ import annotations

import io
import math
from typing import Any

import numpy as np
from PIL import Image


UNKNOWN       = 0
VEGETATION    = 1
WATER         = 2
ROAD          = 3
BUILDING_LOW  = 4
BUILDING_HIGH = 5
BRIDGE        = 6
BARE_GROUND   = 7
SLUM          = 8
SPORTS        = 9


class SemanticSegmentationService:
    """Tile-based semantic segmentation of satellite images."""

    def segment_bytes(self, image_bytes: bytes, tile_size: int = 32) -> dict[str, Any]:
        """
        Segment a satellite image from raw bytes.

        Args:
            image_bytes: JPEG/PNG/WEBP bytes
            tile_size:   Pixels per semantic cell (smaller = finer grid)

        Returns:
            {cols, rows, tile_size, grid: [[{class, intensity, r, g, b}]],  metadata}
        """
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return self._segment_image(img, tile_size)

    # ── Internal ────────────────────────────────────────────────────────────────

    def _segment_image(self, img: Image.Image, tile_size: int) -> dict[str, Any]:
        W, H = img.size
        pixels = np.asarray(img, dtype=np.float32)  # shape (H, W, 3)

        cols = max(1, W // tile_size)
        rows = max(1, H // tile_size)

        counts = [0] * 10
        grid: list[list[dict]] = []

        for row in range(rows):
            row_cells: list[dict] = []
            for col in range(cols):
                y0, y1 = row * tile_size, min((row + 1) * tile_size, H)
                x0, x1 = col * tile_size, min((col + 1) * tile_size, W)
                tile = pixels[y0:y1, x0:x1]
                cell = self._classify_tile(tile)
                row_cells.append(cell)
                counts[cell["class"]] += 1
            grid.append(row_cells)

        total = cols * rows
        metadata = {
            "vegetation_pct":    round(counts[VEGETATION]    / total * 100, 1),
            "water_pct":         round(counts[WATER]         / total * 100, 1),
            "road_pct":          round(counts[ROAD]          / total * 100, 1),
            "building_pct":      round((counts[BUILDING_LOW] + counts[BUILDING_HIGH]) / total * 100, 1),
            "slum_pct":          round(counts[SLUM]          / total * 100, 1),
            "urban_density":     round((counts[BUILDING_HIGH] * 2 + counts[BUILDING_LOW]) / total * 100, 1),
        }

        return {
            "cols":      cols,
            "rows":      rows,
            "tile_size": tile_size,
            "grid":      grid,
            "metadata":  metadata,
        }

    def _classify_tile(self, tile: np.ndarray) -> dict[str, Any]:
        r = float(tile[:, :, 0].mean())
        g = float(tile[:, :, 1].mean())
        b = float(tile[:, :, 2].mean())

        brightness = (r + g + b) / 3.0
        max_c = max(r, g, b)
        min_c = min(r, g, b)
        saturation = max_c - min_c

        cls, intensity = self._classify_rgb(r, g, b, brightness, saturation)
        return {
            "class":     cls,
            "intensity": round(max(0.0, min(1.0, intensity)), 3),
            "r":         round(r),
            "g":         round(g),
            "b":         round(b),
        }

    def _classify_rgb(
        self,
        r: float,
        g: float,
        b: float,
        brightness: float,
        saturation: float,
    ) -> tuple[int, float]:
        # Water: blue dominant, darker
        if b > r * 1.15 and b > g * 1.05 and brightness < 165:
            return WATER, min(1.0, b / 200.0)

        # Sports: bright lime green (artificial turf)
        if g > 140 and g > r * 1.18 and g > b * 1.25 and brightness > 95:
            return SPORTS, min(1.0, (g - r) / 80.0)

        # Vegetation: green dominant (NDVI-like)
        if g > r + 6 and g > b + 4:
            ndvi = (g - r) / max(1.0, g + r)
            return VEGETATION, min(1.0, ndvi * 2.5)

        # Road: low saturation gray, medium brightness
        if saturation < 22 and 95 < brightness < 185:
            return ROAD, brightness / 255.0

        # Building high: very dark (deep shadow footprint)
        if brightness < 80 and saturation < 35:
            return BUILDING_HIGH, min(1.0, 1.0 - brightness / 80.0)

        # Slum: warm reddish-brown, chaotic reflectance
        if r > g * 1.08 and r > b * 1.25 and brightness < 155 and saturation > 15:
            return SLUM, min(1.0, (r - g) / 60.0)

        # Building low: dark, moderately low saturation
        if brightness < 130 and saturation < 42:
            return BUILDING_LOW, min(1.0, 1.0 - brightness / 130.0)

        # Bare ground: warm bright
        if brightness > 135 and r >= g - 5 and r > b:
            return BARE_GROUND, min(1.0, brightness / 220.0)

        return UNKNOWN, 0.5
