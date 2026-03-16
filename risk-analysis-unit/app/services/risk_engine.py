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
        combined_items = []
        targets = [
            f"{self.api_base_url}/api/v1/news",
            f"{self.api_base_url}/api/integrations/alerts"
        ]
        
        for url in targets:
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    res = response.json()
                    data = res.get('data') or res.get('Data') or {}
                    items = data.get('items') or data.get('Items') or []
                    # Normalize Location fields if they differ
                    for item in items:
                        # Standardize mapping: we want 'country' and 'location' (state/city)
                        combined_items.append({
                            "country": item.get("country", "Brasil") or "Brasil",
                            "location": item.get("location") or item.get("region") or "Unknown",
                            "severity": item.get("severity") or "info",
                            "title": item.get("title") or "Alert"
                        })
            except Exception as e:
                logger.warning(f"Failed to fetch from {url}: {e}")
        
        return combined_items

    def _fetch_external_climate_data(self):
        """
        Fetches real climate data from INMET (stations) and Open-Meteo.
        Considers all Brazilian states.
        """
        logger.info("Fetching real climate data for Brazilian states...")
        states_capitals = {
            "AC": {"name": "Rio Branco", "lat": -9.9749, "lon": -67.8076},
            "AL": {"name": "Maceió", "lat": -9.6658, "lon": -35.7350},
            "AP": {"name": "Macapá", "lat": 0.0389, "lon": -51.0664},
            "AM": {"name": "Manaus", "lat": -3.1190, "lon": -60.0217},
            "BA": {"name": "Salvador", "lat": -12.9714, "lon": -38.5014},
            "CE": {"name": "Fortaleza", "lat": -3.7172, "lon": -38.5431},
            "DF": {"name": "Brasília", "lat": -15.7801, "lon": -47.9292},
            "ES": {"name": "Vitória", "lat": -20.3194, "lon": -40.3378},
            "GO": {"name": "Goiânia", "lat": -16.6786, "lon": -49.2539},
            "MA": {"name": "São Luís", "lat": -2.5307, "lon": -44.3068},
            "MT": {"name": "Cuiabá", "lat": -15.5961, "lon": -56.0967},
            "MS": {"name": "Campo Grande", "lat": -20.4428, "lon": -54.6464},
            "MG": {"name": "Belo Horizonte", "lat": -19.9208, "lon": -43.9378},
            "PA": {"name": "Belém", "lat": -1.4558, "lon": -48.4908},
            "PB": {"name": "João Pessoa", "lat": -7.1153, "lon": -34.8610},
            "PR": {"name": "Curitiba", "lat": -25.4284, "lon": -49.2733},
            "PE": {"name": "Recife", "lat": -8.0476, "lon": -34.8770},
            "PI": {"name": "Teresina", "lat": -5.0892, "lon": -42.8019},
            "RJ": {"name": "Rio de Janeiro", "lat": -22.9068, "lon": -43.1729},
            "RN": {"name": "Natal", "lat": -5.7945, "lon": -35.2110},
            "RS": {"name": "Porto Alegre", "lat": -30.0346, "lon": -51.2177},
            "RO": {"name": "Porto Velho", "lat": -8.7612, "lon": -63.9039},
            "RR": {"name": "Boa Vista", "lat": 2.8197, "lon": -60.6733},
            "SC": {"name": "Florianópolis", "lat": -27.5967, "lon": -48.5492},
            "SP": {"name": "São Paulo", "lat": -23.5505, "lon": -46.6333},
            "SE": {"name": "Aracaju", "lat": -10.9111, "lon": -37.0717},
            "TO": {"name": "Palmas", "lat": -10.2128, "lon": -48.3603}
        }

        results = {}
        # Try INMET Station Data first (Aggregated)
        inmet_data = {}
        try:
            # INMET Hourly data for all stations
            # Note: This is a heavy call, in production we might cache this.
            inmet_resp = requests.get("https://apitempo.inmet.gov.br/estacoes/T", timeout=5)
            if inmet_resp.status_code == 200:
                stations = inmet_resp.json()
                for s in stations:
                    st = s.get("SG_ESTADO")
                    if st in states_capitals:
                        # Simple average or just pick main station
                        inmet_data[st] = {
                            "humidity": float(s.get("UMD_INS") or 50),
                            "temp": float(s.get("TEM_INS") or 25),
                            "seismic": 0.0 # INMET doesn't provide seismic
                        }
        except Exception as e:
            logger.warning(f"INMET Stations API failed: {e}. Falling back to Open-Meteo for state data.")

        # Complement with Open-Meteo for stability and specific capital coordinates
        for state, info in states_capitals.items():
            if state in inmet_data:
                results[state] = inmet_data[state]
            else:
                try:
                    # Fallback to Open-Meteo
                    url = f"https://api.open-meteo.com/v1/forecast?latitude={info['lat']}&longitude={info['lon']}&current=temperature_2m,relative_humidity_2m"
                    om_resp = requests.get(url, timeout=3)
                    if om_resp.status_code == 200:
                        curr = om_resp.json().get("current", {})
                        results[state] = {
                            "humidity": curr.get("relative_humidity_2m", 50),
                            "temp": curr.get("temperature_2m", 25),
                            "seismic": 0.01 
                        }
                except:
                    results[state] = {"humidity": 50, "temp": 25, "seismic": 0.01}

        results["World"] = {"humidity": 50, "temp": 25, "seismic": 0.05}
        results["Brasil"] = results.get("DF", results["World"]) # Use DF as Brazil baseline
        
        # --- Japan Data Integration (JMA) ---
        japan_regions = {
            "Hokkaido": {"lat": 43.0641, "lon": 141.3469, "code": "011000"},
            "Tohoku": {"lat": 38.2682, "lon": 140.8694, "code": "040000"},
            "Kanto": {"lat": 35.6895, "lon": 139.6917, "code": "130000"},
            "Chubu": {"lat": 35.1815, "lon": 136.9066, "code": "230000"},
            "Kansai": {"lat": 34.6937, "lon": 135.5023, "code": "270000"},
            "Chugoku": {"lat": 34.3852, "lon": 132.4553, "code": "340000"},
            "Kyushu": {"lat": 33.5902, "lon": 130.4017, "code": "400000"},
            "Okinawa": {"lat": 26.2124, "lon": 127.6809, "code": "471000"}
        }

        for region, info in japan_regions.items():
            try:
                # Open-Meteo JMA specific endpoint for better accuracy in Japan
                url = f"https://api.open-meteo.com/v1/jma?latitude={info['lat']}&longitude={info['lon']}&current=temperature_2m,relative_humidity_2m"
                resp = requests.get(url, timeout=3)
                if resp.status_code == 200:
                    curr = resp.json().get("current", {})
                    results[region] = {
                        "humidity": curr.get("relative_humidity_2m", 50),
                        "temp": curr.get("temperature_2m", 20),
                        "seismic": 0.05 # Baseline for Japan (higher than average)
                    }
                else:
                    results[region] = {"humidity": 50, "temp": 20, "seismic": 0.05}
            except:
                results[region] = {"humidity": 50, "temp": 20, "seismic": 0.05}
        
        results["Japan"] = results.get("Kanto", results["World"])
        
        return results

    def _calculate_risk_scores(self, alerts, climate):
        scores = []
        location_alerts = {}
        for alert in alerts:
            key = (alert['country'], alert['location'])
            if key not in location_alerts:
                location_alerts[key] = []
            location_alerts[key].append(alert)

        # We must consider ALL states from climate data (INMET) even if they have no alerts
        all_monitored_locations = set(location_alerts.keys())
        for region_key in climate.keys():
            if region_key not in ["World", "Brasil"]:
                all_monitored_locations.add(("Brasil", region_key))

        for (country, location) in all_monitored_locations:
            items = location_alerts.get((country, location), [])
            
            # Get climate features (prioritize state-specific data)
            c_data = climate.get(location) or climate.get(country) or climate["World"]
            
            # Feature Vector: [alert_count, humidity, temp, seismic]
            # We scale the prediction based on alert count + environmental stressors
            features = np.array([[len(items), c_data['humidity'], c_data['temp'], c_data['seismic']]])
            
            # Predict Level (0-3)
            prediction = self.model.predict(features)[0]
            
            # Calculate score (0-100)
            # Baseline: alerts increase risk exponentially, humidity/temp have linear weights
            # For floods: humidity > 80 is a multiplier
            # For heat: temp > 35 is a multiplier
            risk_val = (prediction + 1) * 20 
            risk_val += len(items) * 10 
            
            if c_data['humidity'] > 85: risk_val += 15
            if c_data['temp'] > 38: risk_val += 10
            
            final_score = max(min(int(risk_val), 100), 5)
            
            scores.append({
                "country": country,
                "location": location,
                "score": final_score,
                "level": self._get_risk_level(final_score),
                "last_updated": datetime.now().isoformat(),
                "factors": {
                    "alert_count": len(items),
                    "environmental": c_data,
                    "alerts_sample": [a['title'] for a in items[:3]]
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
