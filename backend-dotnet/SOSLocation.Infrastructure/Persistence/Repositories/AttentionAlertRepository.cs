using Dapper;
using SOSLocation.Domain.Entities;
using SOSLocation.Domain.Interfaces;
using SOSLocation.Infrastructure.Persistence.Dapper;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace SOSLocation.Infrastructure.Persistence.Repositories
{
    public class AttentionAlertRepository : IAttentionAlertRepository
    {
        private readonly DapperContext _dapperContext;
        private readonly SOSLocationDbContext _efContext;

        public AttentionAlertRepository(DapperContext dapperContext, SOSLocationDbContext efContext)
        {
            _dapperContext = dapperContext;
            _efContext = efContext;
        }

        public async Task<IEnumerable<AttentionAlert>> GetAllAsync()
        {
            var query = "SELECT * FROM \"AttentionAlerts\" ORDER BY \"CreatedAt\" DESC";
            using var connection = _dapperContext.CreateConnection();
            return await connection.QueryAsync<AttentionAlert>(query);
        }

        public async Task<AttentionAlert?> GetByIdAsync(Guid id)
        {
            var query = "SELECT * FROM \"AttentionAlerts\" WHERE \"Id\" = @Id";
            using var connection = _dapperContext.CreateConnection();
            return await connection.QuerySingleOrDefaultAsync<AttentionAlert>(query, new { Id = id });
        }

        public async Task AddAsync(AttentionAlert alert)
        {
            _efContext.AttentionAlerts.Add(alert);
            await _efContext.SaveChangesAsync();
        }
    }
}
