using System;

namespace SOSLocation.Infrastructure.Services.Gis
{
    public class GisOptions
    {
        public string OpenTopographyUrl { get; set; } = "https://portal.opentopography.org/API/globaldem";
        public string OverpassUrl { get; set; } = "https://overpass-api.de/api/interpreter";
        public string[] OverpassFallbackUrls { get; set; } = Array.Empty<string>();
        public string OpenMeteoUrl { get; set; } = "https://api.open-meteo.com/v1/forecast";
        public string OpenTopographyApiKey { get; set; } = "";
        public string EarthdataUrl { get; set; } = "https://urs.earthdata.nasa.gov/";
        public string EarthdataToken { get; set; } = "";
        public string MapboxToken { get; set; } = "";
        public string MapboxUrl { get; set; } = "https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw";
        public string AwsTerrainUrl { get; set; } = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
        public int CacheExpirationMinutes { get; set; } = 15;
        public int IndexingIntervalMinutes { get; set; } = 30;
        public string CopernicusDemType { get; set; } = "COP30";
        public string SoilGridsUrl { get; set; } = "https://rest.isric.org/soilgrids/v2.0/properties/query";
        public string PlanetaryComputerUrl { get; set; } = "https://planetarycomputer.microsoft.com/api/stac/v1";
        public string PlanetaryComputerToken { get; set; } = "";
        public string WorldPopApiUrl { get; set; } = "https://hub.worldpop.org/rest/data/pop/wpgp";
    }
}
