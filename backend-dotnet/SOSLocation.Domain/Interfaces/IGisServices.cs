using SOSLocation.Domain.Common;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SOSLocation.Domain.Interfaces
{
    public interface IGisService
    {
        Task<List<List<float>>> FetchElevationGridAsync(double minLat, double minLon, double maxLat, double maxLon, int resolution = 128);
        Task<object> FetchUrbanFeaturesAsync(double minLat, double minLon, double maxLat, double maxLon);
        Task<object> FetchSoilDataAsync(double minLat, double minLon, double maxLat, double maxLon);
        Task<object> FetchVegetationDataAsync(double minLat, double minLon, double maxLat, double maxLon);
    }

    public interface IAlertsService
    {
        Task PollAlertsAsync();
        IEnumerable<ExternalAlertDto> GetActiveAlerts();
    }

    public interface IAlertProvider
    {
        string Name { get; }
        Task<IEnumerable<ExternalAlertDto>> FetchAlertsAsync();
    }
}
