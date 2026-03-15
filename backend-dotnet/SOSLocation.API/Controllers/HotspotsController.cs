using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SOSLocation.Infrastructure.Persistence;
using SOSLocation.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;

namespace SOSLocation.API.Controllers
{
    [ApiController]
    [Route("api/hotspots")]
    [Authorize]
    public class HotspotsController : ControllerBase
    {
        private readonly SOSLocationDbContext _context;

        public HotspotsController(SOSLocationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetHotspots()
        {
            var areas = await _context.MapAnnotations
                .Where(m => m.RecordType == "hotspot" && m.Status != "Deleted")
                .ToListAsync();

            if (!areas.Any())
            {
                await SeedHotspotsAsync();
                areas = await _context.MapAnnotations
                    .Where(m => m.RecordType == "hotspot" && m.Status != "Deleted")
                    .ToListAsync();
            }

            return Ok(areas.Select(a => {
                var meta = ParseMeta(a.MetadataJson);
                return new {
                    id = a.Id.ToString(),
                    lat = a.Lat,
                    lng = a.Lng,
                    score = meta.TryGetValue("score", out var s) ? Convert.ToDouble(s?.ToString()) : 50.0,
                    type = meta.TryGetValue("type", out var t) ? t?.ToString() : "Risco Geral",
                    urgency = a.Severity,
                    estimatedAffected = meta.TryGetValue("estimatedAffected", out var ea) ? Convert.ToInt32(ea?.ToString()) : 0
                };
            }));
        }

        private async Task SeedHotspotsAsync()
        {
            _context.MapAnnotations.AddRange(new List<MapAnnotation>
            {
                new MapAnnotation {
                    RecordType = "hotspot",
                    Lat = -21.115, Lng = -42.930,
                    Severity = "critical",
                    Status = "Active",
                    MetadataJson = JsonSerializer.Serialize(new { score = 92.5, type = "Deslizamento", estimatedAffected = 150 })
                },
                new MapAnnotation {
                    RecordType = "hotspot",
                    Lat = -21.125, Lng = -42.950,
                    Severity = "high",
                    Status = "Active",
                    MetadataJson = JsonSerializer.Serialize(new { score = 74.2, type = "Inundação", estimatedAffected = 85 })
                }
            });
            await _context.SaveChangesAsync();
        }

        private static Dictionary<string, object> ParseMeta(string json)
        {
            try { return JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new(); }
            catch { return new(); }
        }
    }
}
