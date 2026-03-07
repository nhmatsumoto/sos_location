import os
import rasterio
from rasterio.windows import from_bounds
from rasterio.warp import transform_bounds
import numpy as np
import httpx
import tempfile
import logging

logger = logging.getLogger(__name__)

# Fallback OpenTopography API (requires free API key in production, but often allows small anonymous requests)
OPENTOPOGRAPHY_URL = "https://portal.opentopography.org/API/globaldem"

async def fetch_elevation_grid(min_lat: float, min_lon: float, max_lat: float, max_lon: float, resolution: int = 128) -> list[list[float]]:
    """
    Fetches elevation data for a bounding box and returns a 2D array of heights.
    - Uses OpenTopography SRTM GL3 (90m) as base source.
    - Interpolates down to `resolution x resolution` grid for WebGL.
    """
    try:
        # 1. Request GeoTIFF from OpenTopography
        url = f"{OPENTOPOGRAPHY_URL}?demtype=SRTMGL3&south={min_lat}&north={max_lat}&west={min_lon}&east={max_lon}&outputFormat=GTiff"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            logger.info(f"Fetching DEM from {url}")
            response = await client.get(url)
            response.raise_for_status()
            
            # 2. Save temporarily
            with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name

        # 3. Read and Resample with Rasterio
        with rasterio.open(tmp_path) as src:
            # Read the first band
            elevation_data = src.read(1)
            
            # Basic validation: if nodata everywhere, replace with 0
            nodata = src.nodata if src.nodata is not None else -32768
            elevation_data = np.where(elevation_data == nodata, 0, elevation_data)
            
            # Downsample to target resolution (e.g., 128x128 for Three.js PlaneGeometry)
            from scipy.ndimage import zoom
            
            z_idx_ratio = resolution / elevation_data.shape[0]
            x_idx_ratio = resolution / elevation_data.shape[1]
            
            resized_grid = zoom(elevation_data, (z_idx_ratio, x_idx_ratio), order=1)  # bilinear interpolation
            
            # Cleanup
            os.remove(tmp_path)
            
            # Convert to standard Python list of lists for JSON serialization
            return resized_grid.tolist()

    except Exception as e:
        logger.error(f"Error fetching/processing DEM: {e}")
        # Return a flat grid as fallback
        return [[0.0 for _ in range(resolution)] for _ in range(resolution)]
