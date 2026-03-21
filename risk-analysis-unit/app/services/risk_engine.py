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
        # (country, location) → (lat, lon) populated on each cycle
        self._location_coords: dict[tuple[str, str], tuple[float, float]] = {}
        
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

        # ── Global world cities ───────────────────────────────────────────────
        global_cities = {
            "New York":     {"lat": 40.7128,  "lon": -74.0060,  "country": "USA"},
            "Los Angeles":  {"lat": 34.0522,  "lon": -118.2437, "country": "USA"},
            "London":       {"lat": 51.5074,  "lon": -0.1278,   "country": "UK"},
            "Paris":        {"lat": 48.8566,  "lon": 2.3522,    "country": "France"},
            "Berlin":       {"lat": 52.5200,  "lon": 13.4050,   "country": "Germany"},
            "Madrid":       {"lat": 40.4168,  "lon": -3.7038,   "country": "Spain"},
            "Rome":         {"lat": 41.9028,  "lon": 12.4964,   "country": "Italy"},
            "Moscow":       {"lat": 55.7558,  "lon": 37.6173,   "country": "Russia"},
            "Beijing":      {"lat": 39.9042,  "lon": 116.4074,  "country": "China"},
            "Shanghai":     {"lat": 31.2304,  "lon": 121.4737,  "country": "China"},
            "Delhi":        {"lat": 28.7041,  "lon": 77.1025,   "country": "India"},
            "Mumbai":       {"lat": 19.0760,  "lon": 72.8777,   "country": "India"},
            "Sydney":       {"lat": -33.8688, "lon": 151.2093,  "country": "Australia"},
            "Cairo":        {"lat": 30.0444,  "lon": 31.2357,   "country": "Egypt"},
            "Lagos":        {"lat": 6.5244,   "lon": 3.3792,    "country": "Nigeria"},
            "Mexico City":  {"lat": 19.4326,  "lon": -99.1332,  "country": "Mexico"},
            "Buenos Aires": {"lat": -34.6037, "lon": -58.3816,  "country": "Argentina"},
            "Istanbul":     {"lat": 41.0082,  "lon": 28.9784,   "country": "Turkey"},
            "Dhaka":        {"lat": 23.8103,  "lon": 90.4125,   "country": "Bangladesh"},
            "Karachi":      {"lat": 24.8607,  "lon": 67.0011,   "country": "Pakistan"},
            "Jakarta":      {"lat": -6.2088,  "lon": 106.8456,  "country": "Indonesia"},
            "Seoul":        {"lat": 37.5665,  "lon": 126.9780,  "country": "South Korea"},
            "Bangkok":      {"lat": 13.7563,  "lon": 100.5018,  "country": "Thailand"},
            "Singapore":    {"lat": 1.3521,   "lon": 103.8198,  "country": "Singapore"},
            "Nairobi":      {"lat": -1.2921,  "lon": 36.8219,   "country": "Kenya"},
            "Lima":         {"lat": -12.0464, "lon": -77.0428,  "country": "Peru"},
            "Bogota":       {"lat": 4.7110,   "lon": -74.0721,  "country": "Colombia"},
            "Santiago":     {"lat": -33.4489, "lon": -70.6693,  "country": "Chile"},
            "Lisbon":       {"lat": 38.7169,  "lon": -9.1399,   "country": "Portugal"},
            "Tehran":       {"lat": 35.6892,  "lon": 51.3890,   "country": "Iran"},
            "Baghdad":      {"lat": 33.3406,  "lon": 44.4009,   "country": "Iraq"},
            "Riyadh":       {"lat": 24.7136,  "lon": 46.6753,   "country": "Saudi Arabia"},
        }

        for city, info in global_cities.items():
            try:
                url = f"https://api.open-meteo.com/v1/forecast?latitude={info['lat']}&longitude={info['lon']}&current=temperature_2m,relative_humidity_2m"
                resp = requests.get(url, timeout=3)
                if resp.status_code == 200:
                    curr = resp.json().get("current", {})
                    results[city] = {
                        "humidity": curr.get("relative_humidity_2m", 50),
                        "temp": curr.get("temperature_2m", 20),
                        "seismic": 0.02,
                        "lat": info["lat"],
                        "lon": info["lon"],
                        "country": info["country"],
                    }
                else:
                    results[city] = {"humidity": 50, "temp": 20, "seismic": 0.02, "lat": info["lat"], "lon": info["lon"], "country": info["country"]}
            except:
                results[city] = {"humidity": 50, "temp": 20, "seismic": 0.02, "lat": info["lat"], "lon": info["lon"], "country": info["country"]}

        # Build (country, location) → (lat, lon) index for hotspot bbox queries
        new_coords: dict[tuple[str, str], tuple[float, float]] = {}
        for state_code, info in states_capitals.items():
            new_coords[("Brasil", state_code)] = (info["lat"], info["lon"])
            new_coords[("Brasil", info["name"])] = (info["lat"], info["lon"])
        for region, info in japan_regions.items():
            new_coords[("Japan", region)] = (info["lat"], info["lon"])
        for city, info in global_cities.items():
            new_coords[(info["country"], city)] = (info["lat"], info["lon"])
        self._location_coords = new_coords

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
            
            coords = self._location_coords.get((country, location))
            entry = {
                "country": country,
                "location": location,
                "score": final_score,
                "level": self._get_risk_level(final_score),
                "last_updated": datetime.now().isoformat(),
                "factors": {
                    "alert_count": len(items),
                    "environmental": {k: v for k, v in c_data.items() if k not in ("lat", "lon", "country")},
                    "alerts_sample": [a['title'] for a in items[:3]]
                }
            }
            if coords:
                entry["lat"] = coords[0]
                entry["lng"] = coords[1]
            scores.append(entry)
            
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

    def get_hotspots_in_bbox(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float) -> list[dict]:
        """Return scored locations whose lat/lon fall within the requested bounding box.
        Each entry is shaped for CityScaleWebGL's OSMEnrichmentAgent:
          { lat, lng, intensity (0-1), radius (metres), type, level, country, location }
        """
        hotspots = []
        for s in self.current_scores:
            lat = s.get("lat")
            lng = s.get("lng")
            if lat is None or lng is None:
                continue
            if min_lat <= lat <= max_lat and min_lon <= lng <= max_lon:
                hotspots.append({
                    "lat":      lat,
                    "lng":      lng,
                    "intensity": s["score"] / 100.0,
                    "radius":   5000.0,  # 5 km influence radius
                    "type":     "risk_score",
                    "level":    s["level"],
                    "country":  s["country"],
                    "location": s["location"],
                    "score":    s["score"],
                })
        return hotspots
