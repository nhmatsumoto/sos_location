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

namespace SOSLocation.Infrastructure.Persistence.Repositories
{
    public class MapDemarcationRepository : IMapDemarcationRepository
    {
        private readonly SOSLocationDbContext _context;

        public MapDemarcationRepository(SOSLocationDbContext context)
        {
            _context = context;
        }

        public async Task<MapDemarcation> GetByIdAsync(Guid id)
        {
            var annotation = await _context.MapAnnotations.FirstOrDefaultAsync(x => x.Id == id);
            return annotation != null ? MapToDto(annotation) : null;
        }

        public async Task<IEnumerable<MapDemarcation>> ListActiveAsync()
        {
            var annotations = await _context.MapAnnotations
                .Where(x => x.RecordType == "Demarcation" && x.Status == "Active")
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
            
            return annotations.Select(MapToDto);
        }

        public async Task AddAsync(MapDemarcation demarcation)
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

            await _context.MapAnnotations.AddAsync(annotation);
            await _context.SaveChangesAsync();
            demarcation.Id = annotation.Id;
        }

        public async Task UpdateAsync(MapDemarcation demarcation)
        {
            var annotation = await _context.MapAnnotations.FirstOrDefaultAsync(x => x.Id == demarcation.Id);
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
                await _context.SaveChangesAsync();
            }
        }

        public async Task DeleteAsync(Guid id)
        {
            var annotation = await _context.MapAnnotations.FirstOrDefaultAsync(x => x.Id == id);
            if (annotation != null)
            {
                annotation.Status = "Deleted";
                await _context.SaveChangesAsync();
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
