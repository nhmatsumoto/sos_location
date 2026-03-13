using SOSLocation.Domain.Operations;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SOSLocation.Domain.Interfaces
{
    public interface IMapDemarcationRepository
    {
        Task<MapDemarcation> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<IEnumerable<MapDemarcation>> ListActiveAsync(CancellationToken ct = default);
        Task AddAsync(MapDemarcation demarcation, CancellationToken ct = default);
        Task UpdateAsync(MapDemarcation demarcation, CancellationToken ct = default);
        Task DeleteAsync(Guid id, CancellationToken ct = default);
    }
}
