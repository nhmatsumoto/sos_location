using SOSLocation.Domain.Operations;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SOSLocation.Domain.Interfaces
{
    public interface IMapDemarcationRepository
    {
        Task<MapDemarcation> GetByIdAsync(Guid id);
        Task<IEnumerable<MapDemarcation>> ListActiveAsync();
        Task AddAsync(MapDemarcation demarcation);
        Task UpdateAsync(MapDemarcation demarcation);
        Task DeleteAsync(Guid id);
    }
}
