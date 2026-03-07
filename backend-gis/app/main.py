from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

from app.services.srtm_fetcher import fetch_elevation_grid

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="MG-LOCATION GIS Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.services.alerts_crawler import alerts_service
import asyncio

@app.on_event("startup")
async def startup_event():
    logging.info("Starting background tasks...")
    asyncio.create_task(alerts_service.start_polling())

@app.on_event("shutdown")
def shutdown_event():
    alerts_service.stop_polling()

class DEMRequest(BaseModel):
    min_lat: float
    min_lon: float
    max_lat: float
    max_lon: float
    resolution: int = 128  # Matches Three.js segments

@app.post("/api/v1/terrain/dem")
async def get_digital_elevation_model(req: DEMRequest):
    grid = await fetch_elevation_grid(
        min_lat=req.min_lat,
        min_lon=req.min_lon,
        max_lat=req.max_lat,
        max_lon=req.max_lon,
        resolution=req.resolution
    )
    
    if not grid or len(grid) == 0:
        raise HTTPException(status_code=500, detail="Failed to process DEM grid")
        
    return {
        "status": "success",
        "metadata": {
            "source": "SRTM GL3 / OpenTopography",
            "resolution": req.resolution
        },
        "data": grid
    }

@app.get("/health")
def health_check():
    return {"status": "operational", "service": "backend-gis"}

class UrbanRequest(BaseModel):
    min_lat: float
    min_lon: float
    max_lat: float
    max_lon: float

from app.services.urban_crawler import fetch_and_consolidate_urban_data

@app.post("/api/v1/urban/features")
async def get_urban_features(req: UrbanRequest):
    data = await fetch_and_consolidate_urban_data(
        min_lat=req.min_lat,
        min_lon=req.min_lon,
        max_lat=req.max_lat,
        max_lon=req.max_lon
    )
    return {
        "status": "success",
        "data": data
    }

@app.get("/api/v1/alerts/active")
def get_active_alerts():
    """Returns currently active disaster alerts collected by the crawler."""
    alerts = alerts_service.get_current_alerts()
    return {
        "status": "success",
        "count": len(alerts),
        "data": [a.dict() for a in alerts]
    }
