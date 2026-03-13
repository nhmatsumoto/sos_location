using Microsoft.EntityFrameworkCore;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Domain.Operations;
using SOSLocation.Domain.Tracking;
using SOSLocation.Infrastructure.Persistence;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;
using System.Threading;

namespace SOSLocation.Infrastructure.Persistence.Repositories
{
    public class MapDemarcationRepository : IMapDemarcationRepository
    {
        private readonly SOSLocationDbContext _context;

        public MapDemarcationRepository(SOSLocationDbContext context)
        {
            _context = context;
        }

        public async Task<MapDemarcation?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            var annotation = await _context.MapAnnotations
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            return annotation != null ? MapToDto(annotation) : null;
        }

        public async Task<IEnumerable<MapDemarcation>> ListActiveAsync(CancellationToken ct = default)
        {
            var annotations = await _context.MapAnnotations
                .AsNoTracking()
                .Where(x => x.RecordType == "Demarcation" && x.Status == "Active")
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync(ct);
            
            return annotations.Select(MapToDto);
        }

        public async Task AddAsync(MapDemarcation demarcation, CancellationToken ct = default)
        {
            var annotation = new MapAnnotation
            {
                RecordType = "Demarcation",
                Title = demarcation.Title,
                Lat = demarcation.Latitude,
                Lng = demarcation.Longitude,
                Status = "Active",
                MetadataJson = JsonSerializer.Serialize(new {
                    demarcation.Description,
                    demarcation.Type,
                    Tags = demarcation.TagsJson
                })
            };

            await _context.MapAnnotations.AddAsync(annotation, ct);
            await _context.SaveChangesAsync(ct);
            demarcation.Id = annotation.Id;
        }

        public async Task UpdateAsync(MapDemarcation demarcation, CancellationToken ct = default)
        {
            var annotation = await _context.MapAnnotations.FirstOrDefaultAsync(x => x.Id == demarcation.Id, ct);
            if (annotation != null)
            {
                annotation.Title = demarcation.Title;
                annotation.Lat = demarcation.Latitude;
                annotation.Lng = demarcation.Longitude;
                annotation.MetadataJson = JsonSerializer.Serialize(new {
                    demarcation.Description,
                    demarcation.Type,
                    Tags = demarcation.TagsJson
                });
                _context.MapAnnotations.Update(annotation);
                await _context.SaveChangesAsync(ct);
            }
        }

        public async Task DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var annotation = await _context.MapAnnotations.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (annotation != null)
            {
                annotation.Status = "Deleted";
                await _context.SaveChangesAsync(ct);
            }
        }

        private MapDemarcation MapToDto(MapAnnotation annotation)
        {
            try 
            {
                var metadata = JsonSerializer.Deserialize<JsonElement>(annotation.MetadataJson);
                return new MapDemarcation
                {
                    Id = annotation.Id,
                    Title = annotation.Title,
                    Latitude = annotation.Lat,
                    Longitude = annotation.Lng,
                    Description = metadata.GetProperty("Description").GetString() ?? "",
                    Type = metadata.GetProperty("Type").GetString() ?? "",
                    TagsJson = metadata.GetProperty("Tags").GetString() ?? "[]",
                    IsActive = annotation.Status == "Active"
                };
            }
            catch
            {
                return new MapDemarcation
                {
                    Id = annotation.Id,
                    Title = annotation.Title,
                    Latitude = annotation.Lat,
                    Longitude = annotation.Lng
                };
            }
        }
    }
}
