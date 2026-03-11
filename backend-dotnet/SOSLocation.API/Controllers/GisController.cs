using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Domain.Common;
using SOSLocation.Application.DTOs.Common;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Linq;

using System.Linq;
using Microsoft.AspNetCore.OutputCaching;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/v1")]
    public class GisController : ControllerBase
    {
        private readonly IGisService _gisService;
        private readonly IAlertsService _alertsService;

        public GisController(IGisService gisService, IAlertsService alertsService)
        {
            _gisService = gisService;
            _alertsService = alertsService;
        }

        [AllowAnonymous]
        [HttpPost("terrain/dem")]
        [OutputCache(PolicyName = "CacheLongLived")]
        public async Task<ActionResult<Result<TerrainElevationDto>>> GetDigitalElevationModel([FromBody] DemRequest req)
        {
            var grid = await _gisService.FetchElevationGridAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon, req.Resolution);

            return Ok(Result<TerrainElevationDto>.Success(new TerrainElevationDto
            {
                Resolution = req.Resolution,
                Grid = grid
            }));
        }

        [AllowAnonymous]
        [HttpPost("urban/features")]
        [OutputCache(PolicyName = "CacheLongLived")]
        public async Task<ActionResult<Result<object>>> GetUrbanFeatures([FromBody] UrbanRequest req)
        {
            var data = await _gisService.FetchUrbanFeaturesAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);
            return Ok(Result<object>.Success(data));
        }

        [AllowAnonymous]
        [HttpPost("soil/data")]
        [OutputCache(PolicyName = "CacheLongLived")]
        public async Task<ActionResult<Result<object>>> GetSoilData([FromBody] GisAreaRequest req)
        {
            var data = await _gisService.FetchSoilDataAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);
            return Ok(Result<object>.Success(data));
        }

        [AllowAnonymous]
        [HttpPost("vegetation/data")]
        [OutputCache(PolicyName = "CacheLongLived")]
        public async Task<ActionResult<Result<object>>> GetVegetationData([FromBody] GisAreaRequest req)
        {
            var data = await _gisService.FetchVegetationDataAsync(req.MinLat, req.MinLon, req.MaxLat, req.MaxLon);
            return Ok(Result<object>.Success(data));
        }

        [AllowAnonymous]
        [HttpGet("alerts/active")]
        [OutputCache(PolicyName = "Cache5Min")]
        public ActionResult<Result<ListResponseDto<ExternalAlertDto>>> GetActiveAlerts()
        {
            var alerts = _alertsService.GetActiveAlerts().ToList();
            return Ok(Result<ListResponseDto<ExternalAlertDto>>.Success(new ListResponseDto<ExternalAlertDto>
            {
                Items = alerts,
                TotalCount = alerts.Count
            }));
        }
    }

    public class GisAreaRequest
    {
        [JsonPropertyName("min_lat")]
        public double MinLat { get; set; }
        [JsonPropertyName("min_lon")]
        public double MinLon { get; set; }
        [JsonPropertyName("max_lat")]
        public double MaxLat { get; set; }
        [JsonPropertyName("max_lon")]
        public double MaxLon { get; set; }
    }

    public class DemRequest
    {
        [JsonPropertyName("min_lat")]
        public double MinLat { get; set; }
        [JsonPropertyName("min_lon")]
        public double MinLon { get; set; }
        [JsonPropertyName("max_lat")]
        public double MaxLat { get; set; }
        [JsonPropertyName("max_lon")]
        public double MaxLon { get; set; }
        public int Resolution { get; set; } = 128;
    }

    public class UrbanRequest
    {
        [JsonPropertyName("min_lat")]
        public double MinLat { get; set; }
        [JsonPropertyName("min_lon")]
        public double MinLon { get; set; }
        [JsonPropertyName("max_lat")]
        public double MaxLat { get; set; }
        [JsonPropertyName("max_lon")]
        public double MaxLon { get; set; }
    }
}
