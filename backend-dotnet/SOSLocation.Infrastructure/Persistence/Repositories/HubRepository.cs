using Dapper;
using SOSLocation.Domain.Tracking;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Persistence.Dapper;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Threading;

namespace SOSLocation.Infrastructure.Persistence.Repositories
{
    public class HubRepository : IHubRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        private const string HubColumns = "\"Id\", \"Name\", \"Location\", \"Status\", \"CreatedAt\", \"UpdatedAt\"";

        public HubRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<EdgeHub>> GetAllAsync(CancellationToken ct = default)
        {
            var query = $"SELECT {HubColumns} FROM \"Hubs\"";
            using var connection = _dapperContext.CreateConnection();
            var command = new CommandDefinition(query, cancellationToken: ct);
            return await connection.QueryAsync<EdgeHub>(command);
        }

        public async Task AddAsync(EdgeHub hub, CancellationToken ct = default)
        {
            _efContext.Hubs.Add(hub);
            await _efContext.SaveChangesAsync(ct);
        }
    }
}
