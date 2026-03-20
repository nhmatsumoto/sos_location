from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.risk_engine import RiskEngine
from app.services.simulation_service import SimulationService
from app.simulation_sdk.scenario import ScenarioRequest, SimulationCatalogItem, SimulationResult
from app.routes.segmentation_routes import router as segmentation_router
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RiskAnalysisUnit")

app = FastAPI(title="SOS Location - Risk Analysis Unit", version="1.0.0")
risk_engine = RiskEngine()
simulation_service = SimulationService()

# Register routers
app.include_router(segmentation_router)

@app.on_event("startup")
def startup_event():
    logger.info("Starting Risk Analysis Unit...")
    scheduler = BackgroundScheduler()
    # Run risk analysis every 5 minutes
    scheduler.add_job(risk_engine.run_cycle, 'interval', minutes=5)
    scheduler.start()
    # Initial run
    risk_engine.run_cycle()

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/v1/risk/scores")
def get_risk_scores():
    return risk_engine.get_current_scores()

@app.get("/api/v1/risk/location/{country}/{location}")
def get_location_risk(country: str, location: str):
    return risk_engine.get_location_score(country, location)


@app.get("/api/v1/simulations/catalog", response_model=list[SimulationCatalogItem])
def get_simulations_catalog():
    return simulation_service.get_catalog()


@app.post("/api/v1/simulations/run", response_model=SimulationResult)
def run_simulation(scenario: ScenarioRequest):
    return simulation_service.run(scenario)
