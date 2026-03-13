import logging
import requests
import pandas as pd
import numpy as np
from datetime import datetime
import os
import json
from sklearn.ensemble import RandomForestClassifier

logger = logging.getLogger("RiskAnalysisUnit")

class RiskEngine:
    def __init__(self):
        self.current_scores = []
        self.api_base_url = os.getenv("INTERNAL_API_URL", "http://backend:8000")
        self.model = self._initialize_model()
        
    def _initialize_model(self):
        params_path = "/app/model_parameters.json"
        data_path = "/app/training_data.csv"
        
        # Default Params
        params = {"n_estimators": 10, "random_state": 42}
        if os.path.exists(params_path):
            try:
                with open(params_path, 'r') as f:
                    params = json.load(f)
                logger.info(f"Loaded model parameters from {params_path}")
            except Exception as e:
                logger.warning(f"Failed to load parameters: {e}. Using defaults.")

        # Filter RandomForest parameters
        rf_params = {k: v for k, v in params.items() if k in ["n_estimators", "max_depth", "random_state", "min_samples_split"]}
        model = RandomForestClassifier(**rf_params)

        if os.path.exists(data_path):
            try:
                df = pd.read_csv(data_path)
                features = ["alert_count", "humidity", "temp", "seismic_activity"]
                X_train = df[features].values
                y_train = df["risk_level"].values
                model.fit(X_train, y_train)
                logger.info(f"Model trained with data from {data_path}")
                return model
            except Exception as e:
                logger.error(f"Failed to load training data: {e}")

        # Fallback to hardcoded synthetic data if file loading fails
        logger.warning("Falling back to hardcoded synthetic data.")
        X_train = np.array([
            [1, 80, 20, 0.01], [5, 40, 30, 0.05], [10, 20, 35, 0.1], [15, 10, 40, 0.2],
            [2, 70, 25, 0.02], [8, 30, 32, 0.08], [12, 15, 38, 0.15], [20, 5, 45, 0.3],
            [0, 90, 15, 0.00], [1, 85, 22, 0.01], [3, 50, 28, 0.04], [6, 35, 33, 0.07]
        ])
        y_train = np.array([0, 1, 2, 3, 0, 1, 2, 3, 0, 0, 1, 1])
        model.fit(X_train, y_train)
        return model

    def run_cycle(self):
        logger.info(f"Starting risk analysis cycle at {datetime.now()}")
        try:
            # 1. Ingest
            alerts = self._fetch_internal_alerts()
            climate = self._fetch_external_climate_data()
            
            # 2. Analyze
            new_scores = self._calculate_risk_scores(alerts, climate)
            
            # 3. Update
            self.current_scores = new_scores
            logger.info(f"Updated risk scores for {len(new_scores)} locations.")
            
        except Exception as e:
            logger.error(f"Error during risk analysis cycle: {e}")

    def _fetch_internal_alerts(self):
        try:
            response = requests.get(f"{self.api_base_url}/api/v1/news")
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            logger.warning(f"Could not fetch internal alerts: {e}")
            return []

    def _fetch_external_climate_data(self):
        # Simulation of rich data from INMET/GEBCO/GSI
        return {
            "Brasil": {"humidity": 18, "temp": 34, "seismic": 0.01},
            "Japão": {"humidity": 65, "temp": 22, "seismic": 0.15},
            "World": {"humidity": 50, "temp": 25, "seismic": 0.05}
        }

    def _calculate_risk_scores(self, alerts, climate):
        scores = []
        location_alerts = {}
        for alert in alerts:
            key = (alert['country'], alert['location'])
            if key not in location_alerts:
                location_alerts[key] = []
            location_alerts[key].append(alert)

        for (country, location), items in location_alerts.items():
            # Get climate features or defaults
            c_data = climate.get(country, climate["World"])
            
            # Feature Vector: [alert_count, humidity, temp, seismic]
            features = np.array([[len(items), c_data['humidity'], c_data['temp'], c_data['seismic']]])
            
            # Predict Level (0-3)
            prediction = self.model.predict(features)[0]
            
            # Calculate raw score (0-100) based on prediction and confidence (simplified)
            base_score = (prediction + 1) * 25 - np.random.randint(0, 10)
            final_score = max(min(int(base_score), 100), 10)
            
            scores.append({
                "country": country,
                "location": location,
                "score": final_score,
                "level": self._get_risk_level(final_score),
                "last_updated": datetime.now().isoformat(),
                "factors": {
                    "alert_count": len(items),
                    "environmental": c_data
                }
            })
            
        return scores

    def _get_risk_level(self, score):
        if score < 25: return "Low"
        if score < 50: return "Medium"
        if score < 75: return "High"
        return "Critical"

    def get_current_scores(self):
        return self.current_scores

    def get_location_score(self, country, location):
        for s in self.current_scores:
            if s['country'].lower() == country.lower() and s['location'].lower() == location.lower():
                return s
        return {"country": country, "location": location, "score": 0, "level": "Unknown"}
