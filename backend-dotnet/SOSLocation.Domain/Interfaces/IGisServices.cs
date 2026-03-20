using SOSLocation.Domain.Common;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SOSLocation.Domain.Interfaces
{
    public interface IGisService
    {
        Task<List<List<float>>> FetchElevationGridAsync(double minLat, double minLon, double maxLat, double maxLon, int resolution = 256);
        Task<object> FetchUrbanFeaturesAsync(double minLat, double minLon, double maxLat, double maxLon);
        Task<object> FetchSoilDataAsync(double minLat, double minLon, double maxLat, double maxLon);
        Task<object> FetchVegetationDataAsync(double minLat, double minLon, double maxLat, double maxLon);
        Task<object> FetchClimateDataAsync(double minLat, double minLon, double maxLat, double maxLon);
        Task<byte[]> GenerateHeightmapAsync(double minLat, double minLon, double maxLat, double maxLon);
        Task<byte[]> GenerateSatelliteImageryAsync(double minLat, double minLon, double maxLat, double maxLon);
        Task<object> ProcessUrbanPipelineAsync(double minLat, double minLon, double maxLat, double maxLon, double rotation = 0);
        Task<object?> FetchLandCoverAsync(double minLat, double minLon, double maxLat, double maxLon);
        Task<object?> FetchPopulationDensityAsync(double minLat, double minLon, double maxLat, double maxLon);
    }

    public interface IAlertsService
    {
        Task PollAlertsAsync();
        IEnumerable<ExternalAlert> GetActiveAlerts();
    }

    public interface IAlertProvider
    {
        string Name { get; }
        Task<IEnumerable<ExternalAlert>> FetchAlertsAsync();
    }
}
