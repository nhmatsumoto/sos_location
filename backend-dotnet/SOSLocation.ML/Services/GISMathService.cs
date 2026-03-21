using System;

namespace SOSLocation.ML.Services
{
    /// <summary>
    /// GIS Mathematical Utilities — server-side port of the frontend GISMath.ts.
    /// Provides sun position (NOAA simplified) and geographic span calculations
    /// used to populate SceneDataDto for the 3D renderer.
    /// </summary>
    public sealed class GISMathService
    {
        /// <summary>
        /// Computes solar azimuth and elevation for a given location and UTC time.
        /// Uses the NOAA simplified solar position algorithm (±0.01° accuracy).
        ///
        /// azimuth : 0=N, 90=E, 180=S, 270=W
        /// elevation: 0=horizon, 90=zenith, negative=below horizon
        /// </summary>
        public (float AzimuthDeg, float ElevationDeg) ComputeSunPosition(
            double lat, double lon, DateTime utcTime)
        {
            // Julian Day Number
            double JD = (utcTime - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc))
                            .TotalDays + 2440587.5;
            double n = JD - 2451545.0; // days since J2000.0

            // Mean longitude and mean anomaly (degrees)
            double L    = ((280.46 + 0.9856474 * n) % 360 + 360) % 360;
            double gRad = (((357.528 + 0.9856003 * n) % 360 + 360) % 360) * Math.PI / 180;

            // Ecliptic longitude (radians)
            double lambdaRad = (L + 1.915 * Math.Sin(gRad) + 0.020 * Math.Sin(2 * gRad))
                               * Math.PI / 180;

            // Obliquity of ecliptic (radians)
            double epsilonRad = (23.439 - 0.0000004 * n) * Math.PI / 180;

            // Declination
            double sinDec = Math.Sin(epsilonRad) * Math.Sin(lambdaRad);
            double dec    = Math.Asin(sinDec);

            // Greenwich Mean Sidereal Time (hours)
            double totalHours = utcTime.Hour + utcTime.Minute / 60.0 + utcTime.Second / 3600.0;
            double GMST = (6.697375 + 0.0657098242 * n + totalHours * 1.00273791) % 24;

            // Local Mean Sidereal Time → Hour Angle
            double LMST = ((GMST + lon / 15) % 24 + 24) % 24;
            double RA   = Math.Atan2(
                              Math.Cos(epsilonRad) * Math.Sin(lambdaRad),
                              Math.Cos(lambdaRad));
            double HA   = (LMST * 15 - RA * 180 / Math.PI) * Math.PI / 180;

            double latRad = lat * Math.PI / 180;
            double sinAlt = Math.Sin(latRad) * sinDec
                          + Math.Cos(latRad) * Math.Cos(dec) * Math.Cos(HA);
            double elevation = Math.Asin(Math.Max(-1, Math.Min(1, sinAlt))) * 180 / Math.PI;

            double cosAlt = Math.Cos(Math.Asin(sinAlt));
            double cosAz  = cosAlt > 0.0001
                ? (sinDec - Math.Sin(latRad) * sinAlt) / (Math.Cos(latRad) * cosAlt)
                : 0;
            double azimuth = Math.Acos(Math.Max(-1, Math.Min(1, cosAz))) * 180 / Math.PI;
            if (Math.Sin(HA) > 0) azimuth = 360 - azimuth;

            return ((float)azimuth, (float)elevation);
        }

        /// <summary>
        /// Converts solar azimuth/elevation to a normalized directional light vector.
        /// Coordinate system: y=up, x=east, z=north (right-hand, matches WebGL scene).
        /// Returns a twilight ambient direction when the sun is below the horizon.
        /// </summary>
        public float[] SunToLightDir(float azimuthDeg, float elevationDeg)
        {
            if (elevationDeg <= 0)
                return new float[] { 0.3f, 0.2f, 0.8f }; // twilight ambient

            double az = azimuthDeg  * Math.PI / 180;
            double el = elevationDeg * Math.PI / 180;

            return new float[]
            {
                (float)(Math.Sin(az) * Math.Cos(el)),
                (float)Math.Sin(el),
                (float)(Math.Cos(az) * Math.Cos(el)),
            };
        }

        /// <summary>
        /// Computes scene world span in metres from a lat/lon bounding box.
        /// Matches the formula used in CityScaleWebGL.tsx for consistent scale.
        /// </summary>
        public (double WorldSpanX, double WorldSpanZ) ComputeWorldSpan(
            double minLat, double minLon, double maxLat, double maxLon)
        {
            double latMid    = (minLat + maxLat) / 2.0;
            double cosLat    = Math.Cos(latMid * Math.PI / 180.0);
            double worldSpanX = (maxLon - minLon) * 111139.0 * cosLat; // metres E-W
            double worldSpanZ = (maxLat - minLat) * 111139.0;          // metres N-S
            return (worldSpanX, worldSpanZ);
        }
    }
}
