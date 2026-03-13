using Microsoft.EntityFrameworkCore;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Domain.Operations;
using SOSLocation.Infrastructure.Persistence;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

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
            return await _context.Set<MapDemarcation>().FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<IEnumerable<MapDemarcation>> ListActiveAsync()
        {
            return await _context.Set<MapDemarcation>()
                .Where(x => x.IsActive)
                .OrderByDescending(x => x.CreatedAtUtc)
                .ToListAsync();
        }

        public async Task AddAsync(MapDemarcation demarcation)
        {
            await _context.Set<MapDemarcation>().AddAsync(demarcation);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(MapDemarcation demarcation)
        {
            _context.Set<MapDemarcation>().Update(demarcation);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var demarcation = await GetByIdAsync(id);
            if (demarcation != null)
            {
                demarcation.IsActive = false;
                await UpdateAsync(demarcation);
            }
        }
    }
}
