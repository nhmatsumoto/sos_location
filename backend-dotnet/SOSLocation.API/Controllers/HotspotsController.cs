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
                var score = 50.0;
                if (meta.TryGetValue("score", out var sObj) && sObj != null)
                {
                    if (sObj is JsonElement je) score = je.GetDouble();
                    else try { score = Convert.ToDouble(sObj); } catch { }
                }

                var type = "Risco Geral";
                if (meta.TryGetValue("type", out var tObj) && tObj != null)
                {
                    if (tObj is JsonElement je) type = je.GetString() ?? type;
                    else type = tObj.ToString() ?? type;
                }

                var affected = 0;
                if (meta.TryGetValue("estimatedAffected", out var eaObj) && eaObj != null)
                {
                    if (eaObj is JsonElement je) affected = je.GetInt32();
                    else try { affected = Convert.ToInt32(eaObj); } catch { }
                }

                return new {
                    id = a.Id.ToString(),
                    lat = a.Lat,
                    lng = a.Lng,
                    score,
                    type,
                    urgency = a.Severity,
                    estimatedAffected = affected
                };
            }));
        }

        private async Task SeedHotspotsAsync()
        {
            _context.MapAnnotations.AddRange(new List<MapAnnotation>
            {
                new MapAnnotation {
                    ExternalId = "HS-UBA-01",
                    Title = "Zona de Risco: Morro do Querosene",
                    RecordType = "hotspot",
                    Lat = -21.115, Lng = -42.930,
                    Severity = "critical",
                    Status = "Active",
                    MetadataJson = JsonSerializer.Serialize(new { score = 92.5, type = "Deslizamento", estimatedAffected = 150 })
                },
                new MapAnnotation {
                    ExternalId = "HS-UBA-02",
                    Title = "Área de Inundação: Beira Rio",
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
