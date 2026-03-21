using SOSLocation.Application.DTOs.Simulation;
using System.Threading;
using System.Threading.Tasks;

namespace SOSLocation.Application.Interfaces
{
    /// <summary>
    /// Orchestrates the complete scene data pipeline for a geographic bounding box.
    /// The implementation lives in SOSLocation.Infrastructure; the API controller
    /// depends only on this interface.
    /// </summary>
    public interface ISceneDataService
    {
        /// <summary>
        /// Fetches and preprocesses all scene data for the given bbox:
        ///   - DEM elevation grid (normalized 0-1)
        ///   - Slope analysis (Horn 1981)
        ///   - Semantic land-use segmentation (RGB heuristic)
        ///   - OSM urban features (buildings, roads, water, etc.)
        ///   - Sun position / light direction
        ///
        /// Results are cached in PostgreSQL for <c>SceneDataService.CacheTtlDays</c> days.
        /// </summary>
        Task<SceneDataDto> FetchSceneDataAsync(
            SceneBboxRequest request,
            CancellationToken ct = default);
    }
}
