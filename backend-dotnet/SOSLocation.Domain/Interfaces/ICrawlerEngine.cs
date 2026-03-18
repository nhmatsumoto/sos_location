using System.Collections.Generic;
using System.Threading.Tasks;

namespace SOSLocation.Domain.Interfaces
{
    public interface ICrawlerEngine
    {
        Task<CrawlerTaskResult> ExecutePipelineAsync(CrawlerTaskRequest request);
    }

    public interface ICrawlerConnector
    {
        string ProviderName { get; }
        Task<CrawlerTaskResult> FetchDataAsync(CrawlerTaskRequest request);
    }

    public interface IWfsConnector : ICrawlerConnector { }
    public interface IPlateauConnector : ICrawlerConnector { }
    public interface IGsiElevationConnector : ICrawlerConnector { }

    public class CrawlerTaskRequest
    {
        public double MinLat { get; set; }
        public double MinLon { get; set; }
        public double MaxLat { get; set; }
        public double MaxLon { get; set; }
        public string RegionCode { get; set; } = string.Empty;
        public List<string> Layers { get; set; } = new();
    }

    public class CrawlerTaskResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public object? Data { get; set; }
        public string Provider { get; set; } = string.Empty;
    }
}
