"""
Semantic Segmentation Routes
==============================
POST /api/v1/semantic/segment
  Body: { image_b64: str, tile_size?: int }
  Returns: SemanticGrid JSON

The agent accepts a base64-encoded satellite image and returns the
full semantic grid (per-tile class + intensity) plus aggregate metadata.
"""

from __future__ import annotations

import base64
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.semantic_segmentation import SemanticSegmentationService

logger = logging.getLogger("SemanticSegmentation")
router = APIRouter(prefix="/api/v1/semantic", tags=["semantic"])

_service = SemanticSegmentationService()


class SegmentRequest(BaseModel):
    image_b64: str = Field(..., description="Base64-encoded satellite image (JPEG or PNG)")
    tile_size: int = Field(32, ge=4, le=128, description="Pixels per semantic cell")


class SegmentResponse(BaseModel):
    cols:      int
    rows:      int
    tile_size: int
    grid:      list  # list[list[dict]]
    metadata:  dict


@router.post("/segment", response_model=SegmentResponse)
def segment_image(req: SegmentRequest) -> SegmentResponse:
    """
    Segment a satellite image into a semantic land-use grid.

    The grid is indexed [row][col]. Each cell contains:
      class     — integer 0-9 (see SemanticClass enum)
      intensity — float 0-1 (NDVI for veg, shadow depth for buildings, etc.)
      r, g, b   — average pixel values of the source tile
    """
    try:
        # Strip data-URI prefix if present (data:image/jpeg;base64,...)
        b64_data = req.image_b64
        if "," in b64_data:
            b64_data = b64_data.split(",", 1)[1]

        image_bytes = base64.b64decode(b64_data)
        result = _service.segment_bytes(image_bytes, tile_size=req.tile_size)
        logger.info(
            "Segmented image → %dx%d grid, tile_size=%d",
            result["cols"], result["rows"], result["tile_size"],
        )
        return SegmentResponse(**result)

    except Exception as exc:
        logger.exception("Segmentation failed")
        raise HTTPException(status_code=500, detail=f"Segmentation error: {exc}") from exc


@router.get("/health")
def health():
    return {"status": "ok", "service": "semantic-segmentation"}
