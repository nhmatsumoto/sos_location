using Dapper;
using SOSLocation.Domain.Entities;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Persistence.Dapper;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Persistence.Repositories
{
    public class RescueGroupRepository : IRescueGroupRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        public RescueGroupRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<RescueGroup>> GetAllAsync()
        {
            var query = "SELECT * FROM \"RescueGroups\"";
            using var connection = _dapperContext.CreateConnection();
            return await connection.QueryAsync<RescueGroup>(query);
        }

        public async Task AddAsync(RescueGroup group)
        {
            _efContext.RescueGroups.Add(group);
            await _efContext.SaveChangesAsync();
        }

        public async Task<int> GetCountByStatusAsync(params string[] statuses)
        {
            var query = "SELECT COUNT(*) FROM \"RescueGroups\" WHERE \"Status\" = ANY(@Statuses)";
            using var connection = _dapperContext.CreateConnection();
            return await connection.ExecuteScalarAsync<int>(query, new { Statuses = statuses });
        }
    }

    public class SupplyLogisticsRepository : ISupplyLogisticsRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        public SupplyLogisticsRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<SupplyLogistics>> GetAllAsync()
        {
            var query = "SELECT * FROM \"SupplyLogistics\"";
            using var connection = _dapperContext.CreateConnection();
            return await connection.QueryAsync<SupplyLogistics>(query);
        }

        public async Task AddAsync(SupplyLogistics item)
        {
            _efContext.SupplyLogistics.Add(item);
            await _efContext.SaveChangesAsync();
        }

        public async Task<int> GetCountByStatusAsync(string status)
        {
            var query = "SELECT COUNT(*) FROM \"SupplyLogistics\" WHERE \"Status\" = @Status";
            using var connection = _dapperContext.CreateConnection();
            return await connection.ExecuteScalarAsync<int>(query, new { Status = status });
        }
    }
}
