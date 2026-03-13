using Dapper;
using SOSLocation.Domain.Missions;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Persistence.Dapper;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.Threading;

namespace SOSLocation.Infrastructure.Persistence.Repositories
{
    public class RescueGroupRepository : IRescueGroupRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        private const string GroupColumns = "\"Id\", \"Name\", \"Status\", \"ContactInfo\", \"CreatedAt\", \"UpdatedAt\"";

        public RescueGroupRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<RescueGroup>> GetAllAsync(CancellationToken ct = default)
        {
            var query = $"SELECT {GroupColumns} FROM \"RescueGroups\"";
            using var connection = _dapperContext.CreateConnection();
            var command = new CommandDefinition(query, cancellationToken: ct);
            return await connection.QueryAsync<RescueGroup>(command);
        }

        public async Task AddAsync(RescueGroup group, CancellationToken ct = default)
        {
            _efContext.RescueGroups.Add(group);
            await _efContext.SaveChangesAsync(ct);
        }

        public async Task<int> GetCountByStatusAsync(CancellationToken ct = default, params string[] statuses)
        {
            var query = "SELECT COUNT(*) FROM \"RescueGroups\" WHERE \"Status\" = ANY(@Statuses)";
            using var connection = _dapperContext.CreateConnection();
            var command = new CommandDefinition(query, new { Statuses = statuses }, cancellationToken: ct);
            return await connection.ExecuteScalarAsync<int>(command);
        }
    }

    public class SupplyLogisticsRepository : ISupplyLogisticsRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        private const string SupplyColumns = "\"Id\", \"ItemName\", \"Quantity\", \"Status\", \"Location\", \"CreatedAt\", \"UpdatedAt\"";

        public SupplyLogisticsRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<SupplyLogistics>> GetAllAsync(CancellationToken ct = default)
        {
            var query = $"SELECT {SupplyColumns} FROM \"SupplyLogistics\"";
            using var connection = _dapperContext.CreateConnection();
            var command = new CommandDefinition(query, cancellationToken: ct);
            return await connection.QueryAsync<SupplyLogistics>(command);
        }

        public async Task AddAsync(SupplyLogistics item, CancellationToken ct = default)
        {
            _efContext.SupplyLogistics.Add(item);
            await _efContext.SaveChangesAsync(ct);
        }

        public async Task<int> GetCountByStatusAsync(string status, CancellationToken ct = default)
        {
            var query = "SELECT COUNT(*) FROM \"SupplyLogistics\" WHERE \"Status\" = @Status";
            using var connection = _dapperContext.CreateConnection();
            var command = new CommandDefinition(query, new { Status = status }, cancellationToken: ct);
            return await connection.ExecuteScalarAsync<int>(command);
        }
    }
}
