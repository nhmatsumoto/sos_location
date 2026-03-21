using System;
using System.Threading.Tasks;
using SOSLocation.ML.Models;

namespace SOSLocation.ML.Services
{
    /// <summary>
    /// Multi-hazard risk scoring engine.
    /// Ports risk_engine.py _calculate_risk_scores() logic to native .NET.
    ///
    /// Scoring formula (0–100):
    ///   base = (predicted_level + 1) * 20
    ///   + alert_count * 10
    ///   + humidity bonus (>85 → +15)
    ///   + temperature bonus (>38 → +10)
    ///   clamped to [5, 100]
    ///
    /// Predicted level (0–3) is derived from the feature vector
    /// [alert_count, humidity, temp, seismic] using the same thresholds
    /// that the Python RandomForest was trained on.
    /// </summary>
    public sealed class RiskEngineService
    {
        /// <summary>
        /// Compute a composite risk score for the given location features.
        /// </summary>
        public Task<RiskScoreResult> ComputeRiskScoresAsync(RiskInput input)
            => Task.FromResult(ComputeRiskScores(input));

        /// <summary>Synchronous variant.</summary>
        public RiskScoreResult ComputeRiskScores(RiskInput input)
        {
            // Feature-based level prediction (mirrors the synthetic training distribution
            // used as fallback in risk_engine.py).
            int predictedLevel = PredictLevel(input.AlertCount, input.Humidity, input.Temperature, input.SeismicActivity);

            int riskVal = (predictedLevel + 1) * 20;
            riskVal += input.AlertCount * 10;

            if (input.Humidity > 85)    riskVal += 15;
            if (input.Temperature > 38) riskVal += 10;

            int finalScore = Math.Max(5, Math.Min(100, riskVal));

            return new RiskScoreResult
            {
                Country     = input.Country,
                Location    = input.Location,
                Score       = finalScore,
                Level       = GetRiskLevel(finalScore),
                LastUpdated = DateTime.UtcNow.ToString("o"),
            };
        }

        // ── Internal helpers ────────────────────────────────────────────────────

        /// <summary>
        /// Deterministic level classifier (0–3) that approximates the Random Forest
        /// trained on synthetic data in the Python service.
        ///
        /// Thresholds derived from the synthetic dataset in risk_engine.py:
        ///   y=0 → alerts 0-2, humidity >=70, temp <=25, seismic <=0.02
        ///   y=1 → alerts 3-8, humidity 30-50, temp 25-33, seismic 0.04-0.08
        ///   y=2 → alerts 9-15, humidity 10-20, temp 32-38, seismic 0.08-0.15
        ///   y=3 → alerts >15,  humidity <10, temp >38, seismic >0.15
        /// </summary>
        private static int PredictLevel(int alertCount, double humidity, double temperature, double seismic)
        {
            double score = 0;

            // Alert count contribution (max weight component)
            score += alertCount switch
            {
                0 or 1 => 0,
                <= 3   => 0.5,
                <= 8   => 1.0,
                <= 14  => 2.0,
                _      => 3.0,
            };

            // Humidity (lower = higher risk)
            score += humidity switch
            {
                >= 70 => 0,
                >= 40 => 0.5,
                >= 20 => 1.0,
                _     => 1.5,
            };

            // Temperature (higher = higher risk)
            score += temperature switch
            {
                <= 25 => 0,
                <= 32 => 0.5,
                <= 38 => 1.0,
                _     => 1.5,
            };

            // Seismic activity
            score += seismic switch
            {
                <= 0.02 => 0,
                <= 0.07 => 0.5,
                <= 0.14 => 1.0,
                _       => 1.5,
            };

            // Map accumulated score to level 0-3
            if (score <= 1.0) return 0;
            if (score <= 2.5) return 1;
            if (score <= 4.5) return 2;
            return 3;
        }

        private static string GetRiskLevel(int score) => score switch
        {
            < 25 => "Low",
            < 50 => "Medium",
            < 75 => "High",
            _    => "Critical",
        };
    }
}
